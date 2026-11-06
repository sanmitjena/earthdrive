/**
 * EarthDrive Multi-Vehicle Physics Engine
 * Handles real-time kinematics, steering geometry, suspension roll/pitch,
 * drift slip dynamics, gear transmission, and 6-DOF flight mechanics.
 */

class PhysicsEngine {
  constructor() {
    this.vehicleType = 'car'; // 'car' | 'bus' | 'train' | 'plane'

    // State
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.speed = 0; // m/s
    this.heading = 0; // radians (0 = North/+Z, PI/2 = East/+X)
    this.steer = 0; // radians
    this.slip = 0; // lateral drift velocity
    this.pitch = 0; // radians (suspension or flight pitch)
    this.roll = 0; // radians (suspension or flight roll)

    // Flight-specific
    this.altitude = 0;
    this.throttle = 0; // 0 to 1
    this.isAirborne = false;

    // Transmission & Engine
    this.gear = 1;
    this.rpm = 900; // RPM
    this.tripDistance = 0; // meters

    // Collision & Screen shake
    this.shakeIntensity = 0;
  }

  reset(x = 0, z = 0, heading = 0) {
    this.x = x;
    this.y = 0;
    this.z = z;
    this.speed = 0;
    this.heading = heading;
    this.steer = 0;
    this.slip = 0;
    this.pitch = 0;
    this.roll = 0;
    this.gear = 1;
    this.rpm = 900;
    this.altitude = 0;
    this.throttle = 0;
    this.isAirborne = false;
  }

  setVehicleType(type) {
    this.vehicleType = type;
    this.speed = 0;
    this.slip = 0;
    this.pitch = 0;
    this.roll = 0;
    if (type === 'plane') {
      this.throttle = 0.2;
    }
  }

  /**
   * Main Physics Tick
   * @param {Object} input - { forward, back, left, right, handbrake, pitchUp, pitchDown }
   * @param {number} dt - delta time in seconds
   * @param {Function} getGroundHeight - callback for terrain altitude
   */
  update(input, dt, getGroundHeight) {
    // Clamp delta time to avoid physics explosion on lag
    dt = Math.min(0.08, Math.max(0.001, dt));

    if (this.vehicleType === 'plane') {
      this.updateFlightPhysics(input, dt, getGroundHeight);
    } else {
      this.updateGroundPhysics(input, dt, getGroundHeight);
    }

    // Decay camera shake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 4.0);
    }

    return {
      x: this.x,
      y: this.y,
      z: this.z,
      speedKmh: this.speed * 3.6,
      rpmNorm: (this.rpm - 800) / 7200,
      gear: this.gear,
      slip: this.slip,
      heading: this.heading,
      pitch: this.pitch,
      roll: this.roll,
      tripDistance: this.tripDistance
    };
  }

  updateGroundPhysics(input, dt, getGroundHeight) {
    const isBus = this.vehicleType === 'bus';
    const isTrain = this.vehicleType === 'train';

    // 1. Vehicle specs
    const maxSpeed = isTrain ? 320 / 3.6 : isBus ? 120 / 3.6 : 285 / 3.6;
    const maxReverse = 35 / 3.6;
    const accelRate = isTrain ? 8.5 : isBus ? 5.8 : 14.5;
    const brakeRate = isTrain ? 10.0 : isBus ? 14.0 : 26.0;
    const dragCoeff = isTrain ? 0.08 : isBus ? 0.25 : 0.16;

    // 2. Throttle & Braking
    let accel = 0;
    const movingForward = this.speed >= 0.1;
    const movingReverse = this.speed <= -0.1;

    if (input.forward) {
      if (movingReverse) {
        // Braking while in reverse
        accel += brakeRate;
      } else {
        // Normal acceleration (tapers at top speed)
        const powerRatio = Math.max(0.15, 1 - Math.abs(this.speed) / maxSpeed);
        accel += accelRate * powerRatio;
      }
    } else if (input.back) {
      if (movingForward) {
        // Active Braking
        accel -= brakeRate;
      } else {
        // Reverse acceleration
        accel -= accelRate * 0.55;
      }
    } else {
      // Natural rolling resistance
      const naturalDecel = 3.2;
      if (Math.abs(this.speed) > 0.05) {
        accel -= Math.sign(this.speed) * naturalDecel;
      } else {
        this.speed = 0;
      }
    }

    // Handbrake application
    if (input.handbrake) {
      accel -= Math.sign(this.speed) * brakeRate * 1.5;
    }

    // Aerodynamic Drag
    accel -= Math.sign(this.speed) * dragCoeff * (this.speed * this.speed * 0.04);

    // Integrate Speed
    this.speed += accel * dt;
    this.speed = Math.max(-maxReverse, Math.min(maxSpeed, this.speed));

    // 3. Transmission & RPM Simulation
    this.updateGears(maxSpeed);

    // 4. Steering Dynamics with Speed-Sensitive Lock
    const absSpeed = Math.abs(this.speed);
    const speedRatio = Math.min(1.0, absSpeed / (maxSpeed * 0.7));
    // Max steer angle shrinks at high speed to maintain stability
    const maxSteerAngle = isBus ? 0.42 : isTrain ? 0.12 : (0.58 - speedRatio * 0.38);

    let targetSteer = 0;
    if (input.left) targetSteer += maxSteerAngle;
    if (input.right) targetSteer -= maxSteerAngle;

    // Smooth steer interpolation
    const steerSpeed = isBus ? 4.5 : 8.0;
    this.steer += (targetSteer - this.steer) * Math.min(1.0, dt * steerSpeed);

    // 5. Yaw / Heading calculation (Bicycle model)
    const wheelbase = isBus ? 6.2 : isTrain ? 12.0 : 2.7;
    const turnCurvature = Math.tan(this.steer) / wheelbase;
    const yawRate = this.speed * turnCurvature;
    this.heading += yawRate * dt;

    // 6. Drift & Lateral Slip Physics
    const grip = input.handbrake ? 0.35 : 0.88;
    const centripetalAccel = this.speed * yawRate;
    const maxLateralGrip = grip * 9.81;

    if (Math.abs(centripetalAccel) > maxLateralGrip || (input.handbrake && absSpeed > 6)) {
      // Lateral break out / sliding
      const slipForce = (centripetalAccel - Math.sign(centripetalAccel) * maxLateralGrip) * 0.7;
      this.slip += (slipForce - this.slip) * Math.min(1.0, dt * 5.0);
    } else {
      // Grip recovery
      this.slip *= Math.exp(-dt * 6.5);
    }

    // 7. Update Position (World coordinates)
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const sideX = Math.cos(this.heading);
    const sideZ = -Math.sin(this.heading);

    const deltaDist = (forwardX * this.speed + sideX * this.slip) * dt;
    const deltaDistZ = (forwardZ * this.speed + sideZ * this.slip) * dt;

    this.x += deltaDist;
    this.z += deltaDistZ;

    // Track total distance
    this.tripDistance += Math.abs(this.speed) * dt;

    // 8. Ground height & Suspension Pitch / Roll
    const groundY = getGroundHeight ? getGroundHeight(this.x, this.z) : 0;
    this.y = groundY;

    // Suspension Body Roll (leaning outwards in turns)
    const targetRoll = (-centripetalAccel / 9.81) * (isBus ? 0.12 : 0.08);
    this.roll += (targetRoll - this.roll) * Math.min(1.0, dt * 6.0);

    // Suspension Pitch (dipping nose under braking, squat under acceleration)
    const targetPitch = (accel / 9.81) * 0.045;
    this.pitch += (targetPitch - this.pitch) * Math.min(1.0, dt * 6.0);
  }

  updateFlightPhysics(input, dt, getGroundHeight) {
    const maxAirspeed = 880 / 3.6; // ~880 km/h
    const minTakeoffSpeed = 75 / 3.6;

    // Throttle control
    if (input.forward) this.throttle = Math.min(1.0, this.throttle + dt * 0.4);
    if (input.back) this.throttle = Math.max(0.05, this.throttle - dt * 0.4);

    // Forward speed follows throttle with jet engine lag
    const targetSpeed = this.throttle * maxAirspeed;
    this.speed += (targetSpeed - this.speed) * Math.min(1.0, dt * 1.5);

    // Pitch control (Elevators)
    const pitchAuthority = Math.min(1.0, this.speed / minTakeoffSpeed);
    let targetPitchRate = 0;
    if (input.pitchDown || input.back) targetPitchRate += 0.8 * pitchAuthority;
    if (input.pitchUp || input.forward) targetPitchRate -= 0.8 * pitchAuthority;

    this.pitch += targetPitchRate * dt;
    this.pitch = Math.max(-0.65, Math.min(0.65, this.pitch));

    // Roll / Banking control (Ailerons)
    let targetRoll = 0;
    if (input.left) targetRoll += 0.85;
    if (input.right) targetRoll -= 0.85;

    this.roll += (targetRoll - this.roll) * Math.min(1.0, dt * 4.5);

    // Coordinated Turn Heading Change (Lift vector banked turns)
    const turnRate = -Math.sin(this.roll) * 1.4 * (this.speed / maxAirspeed);
    this.heading += turnRate * dt;

    // Aerodynamic Lift & Vertical climb/dive
    const groundY = getGroundHeight ? getGroundHeight(this.x, this.z) : 0;
    const liftFactor = Math.pow(Math.min(1.2, this.speed / minTakeoffSpeed), 2);
    const climbRate = Math.sin(-this.pitch) * this.speed * liftFactor;

    this.altitude += climbRate * dt;

    // Ground collision / runway contact
    if (this.altitude <= groundY + 0.3) {
      this.altitude = groundY + 0.3;
      this.isAirborne = false;
      this.pitch = Math.max(0, this.pitch * 0.5); // level out on wheels
      this.roll *= 0.5;
    } else {
      this.isAirborne = true;
    }

    this.y = this.altitude;

    // World Movement
    const horizSpeed = this.speed * Math.cos(this.pitch);
    this.x += Math.sin(this.heading) * horizSpeed * dt;
    this.z += Math.cos(this.heading) * horizSpeed * dt;

    this.tripDistance += this.speed * dt;
    this.rpm = 2000 + this.throttle * 6000;
    this.gear = 6;
  }

  updateGears(maxSpeed) {
    if (this.speed < -0.5) {
      this.gear = 'R';
      this.rpm = 1200 + (Math.abs(this.speed) / 10) * 4500;
      return;
    }

    if (Math.abs(this.speed) < 0.2) {
      this.gear = 'N';
      this.rpm = 900;
      return;
    }

    const gearRatios = [0, 45, 85, 135, 185, 235, 300]; // km/h speed brackets
    const speedKmh = Math.abs(this.speed) * 3.6;

    let currentGear = 1;
    for (let i = 1; i < gearRatios.length; i++) {
      if (speedKmh >= gearRatios[i - 1]) {
        currentGear = i;
      }
    }
    this.gear = currentGear;

    // RPM curve within gear
    const lowerSpeed = gearRatios[currentGear - 1] || 0;
    const upperSpeed = gearRatios[currentGear] || 300;
    const gearProgress = (speedKmh - lowerSpeed) / (upperSpeed - lowerSpeed);

    this.rpm = 1500 + Math.max(0, Math.min(1, gearProgress)) * 5500;
  }

  handleBarrierCollision(normalX, normalZ) {
    // Reflect velocity with bounce damping
    const dot = this.speed * (Math.sin(this.heading) * normalX + Math.cos(this.heading) * normalZ);
    this.speed = -this.speed * 0.4;
    this.slip = -this.slip * 0.5;
    this.shakeIntensity = Math.min(1.0, Math.abs(dot) * 0.08 + 0.3);

    if (window.soundEngine) {
      window.soundEngine.triggerCrash();
    }
  }
}

window.PhysicsEngine = PhysicsEngine;
