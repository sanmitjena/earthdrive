/**
 * EarthDrive Vehicle Factory
 * Generates detailed procedural 3D models for:
 * - Sports Supercar (with steering, brake lights, headlights, exhaust)
 * - City Transit / Coach Bus
 * - High-speed Bullet Train
 * - Supersonic Flight Jet
 */

class VehicleFactory {
  static createMaterials() {
    return {
      carBody: new THREE.MeshStandardMaterial({
        color: 0x00d2ff, // Vibrant electric cyan / customisable
        metalness: 0.75,
        roughness: 0.22,
        name: 'carBody'
      }),
      carBodyDark: new THREE.MeshStandardMaterial({
        color: 0x11161d,
        metalness: 0.85,
        roughness: 0.3
      }),
      carbon: new THREE.MeshStandardMaterial({
        color: 0x181818,
        roughness: 0.7,
        metalness: 0.2
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x101820,
        metalness: 0.9,
        roughness: 0.1,
        transmission: 0.6,
        transparent: true,
        opacity: 0.85
      }),
      rim: new THREE.MeshStandardMaterial({
        color: 0xdde4ec,
        metalness: 0.9,
        roughness: 0.15
      }),
      tire: new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.92,
        metalness: 0.05
      }),
      caliper: new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        roughness: 0.4,
        metalness: 0.6
      }),
      headlightOff: new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 0.1,
        metalness: 0.8
      }),
      headlightOn: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xccf0ff,
        emissiveIntensity: 1.5,
        roughness: 0.1
      }),
      taillightOff: new THREE.MeshStandardMaterial({
        color: 0x5a0b0b,
        roughness: 0.4
      }),
      taillightNormal: new THREE.MeshStandardMaterial({
        color: 0xbb1111,
        emissive: 0xff2222,
        emissiveIntensity: 0.8
      }),
      taillightBraking: new THREE.MeshStandardMaterial({
        color: 0xff1111,
        emissive: 0xff0000,
        emissiveIntensity: 3.0
      }),
      interior: new THREE.MeshStandardMaterial({
        color: 0x222226,
        roughness: 0.8
      })
    };
  }

  /**
   * Builds the Supercar model
   */
  static buildSupercar() {
    const mats = this.createMaterials();
    const group = new THREE.Group();
    group.name = 'supercar';

    const chassis = new THREE.Group();
    chassis.name = 'chassis';
    group.add(chassis);

    // 1. Main lower tub / body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.42, 4.4), mats.carBody);
    lowerBody.position.y = 0.48;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    chassis.add(lowerBody);

    // 2. Sculpted aerodynamic hood (slanted)
    const hoodGeo = new THREE.BoxGeometry(1.78, 0.3, 1.4);
    const hood = new THREE.Mesh(hoodGeo, mats.carBody);
    hood.position.set(0, 0.52, 1.25);
    hood.rotation.x = 0.07;
    hood.castShadow = true;
    chassis.add(hood);

    // Front splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.06, 0.6), mats.carbon);
    splitter.position.set(0, 0.28, 2.05);
    splitter.castShadow = true;
    chassis.add(splitter);

    // 3. Cabin / Greenhouse
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.54, 2.1), mats.glass);
    cabin.position.set(0, 0.88, -0.2);
    cabin.castShadow = true;
    chassis.add(cabin);

    // Roof scoop / carbon roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 1.4), mats.carbon);
    roof.position.set(0, 1.15, -0.3);
    chassis.add(roof);

    // 4. Rear Engine Deck & Diffuser
    const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.44, 1.3), mats.carBody);
    rearDeck.position.set(0, 0.54, -1.5);
    rearDeck.castShadow = true;
    chassis.add(rearDeck);

    // Rear GT Wing / Spoiler
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.38), mats.carbon);
    wingBlade.position.set(0, 1.05, -2.05);
    wingBlade.castShadow = true;
    chassis.add(wingBlade);

    // Wing upright struts
    [-0.55, 0.55].forEach(x => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.2), mats.carbon);
      strut.position.set(x, 0.88, -2.0);
      chassis.add(strut);
    });

    // Rear diffuser
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.5), mats.carbon);
    diffuser.position.set(0, 0.3, -2.12);
    chassis.add(diffuser);

    // Twin Exhausts
    const exhaustPipes = [];
    [-0.3, 0.3].forEach(x => {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12),
        mats.carbon
      );
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, 0.36, -2.2);
      chassis.add(pipe);
      exhaustPipes.push(pipe);
    });

    // 5. Headlights (LED strips)
    const headlightMeshes = [];
    [-0.68, 0.68].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.12), mats.headlightOn);
      hl.position.set(x, 0.56, 2.14);
      chassis.add(hl);
      headlightMeshes.push(hl);
    });

    // Actual Three.js SpotLight projecting from headlights
    const leftLight = new THREE.SpotLight(0xf0f8ff, 2.5, 45, Math.PI / 5, 0.4, 1.2);
    leftLight.position.set(-0.68, 0.6, 2.1);
    leftLight.target.position.set(-0.68, 0.2, 25);
    chassis.add(leftLight);
    chassis.add(leftLight.target);

    const rightLight = new THREE.SpotLight(0xf0f8ff, 2.5, 45, Math.PI / 5, 0.4, 1.2);
    rightLight.position.set(0.68, 0.6, 2.1);
    rightLight.target.position.set(0.68, 0.2, 25);
    chassis.add(rightLight);
    chassis.add(rightLight.target);

    // 6. Taillights (Continuous horizontal LED bar)
    const taillightBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.08, 0.08),
      mats.taillightNormal
    );
    taillightBar.position.set(0, 0.64, -2.18);
    chassis.add(taillightBar);

    // 7. Four Detailed Wheels with brake calipers
    const wheels = [];
    const wheelPositions = [
      { x: -0.92, y: 0.36, z: 1.35, isFront: true },  // Front Left
      { x: 0.92, y: 0.36, z: 1.35, isFront: true },   // Front Right
      { x: -0.94, y: 0.38, z: -1.35, isFront: false }, // Rear Left
      { x: 0.94, y: 0.38, z: -1.35, isFront: false }  // Rear Right
    ];

    wheelPositions.forEach((pos, idx) => {
      // Steer pivot for front wheels
      const pivot = new THREE.Group();
      pivot.position.set(pos.x, pos.y, pos.z);
      group.add(pivot);

      // Rolling hub
      const rollHub = new THREE.Group();
      pivot.add(rollHub);

      // Tire rubber (Cylinder rotated on Z axis)
      const radius = pos.isFront ? 0.35 : 0.37;
      const width = pos.isFront ? 0.26 : 0.32;
      const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tireMesh = new THREE.Mesh(tireGeo, mats.tire);
      tireMesh.castShadow = true;
      rollHub.add(tireMesh);

      // Alloy Rim
      const rimGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 1.02, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMesh = new THREE.Mesh(rimGeo, mats.rim);
      rollHub.add(rimMesh);

      // Brake rotor disc
      const rotorGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.04, 16);
      rotorGeo.rotateZ(Math.PI / 2);
      const rotorMesh = new THREE.Mesh(rotorGeo, mats.carbon);
      rollHub.add(rotorMesh);

      // Brake caliper (attached to steering pivot, doesn't spin with wheel)
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.18), mats.caliper);
      caliper.position.set(pos.x > 0 ? -0.06 : 0.06, 0.14, 0);
      pivot.add(caliper);

      wheels.push({
        pivot,
        rollHub,
        isFront: pos.isFront,
        isRight: pos.x > 0,
        radius
      });
    });

    return {
      root: group,
      chassis,
      wheels,
      mats,
      lights: {
        left: leftLight,
        right: rightLight,
        headlights: headlightMeshes,
        taillightBar
      },
      exhaustPipes
    };
  }

  /**
   * Builds the Heavy City / Coach Bus model
   */
  static buildBus() {
    const mats = this.createMaterials();
    const group = new THREE.Group();
    group.name = 'bus';

    const chassis = new THREE.Group();
    group.add(chassis);

    // Bus body material (Sleek deep emerald / teal tour bus)
    const busPaint = new THREE.MeshStandardMaterial({
      color: 0x1d5d4d,
      roughness: 0.35,
      metalness: 0.4
    });

    // 1. Main Bus Body (Length 10m, Width 2.5m, Height 2.8m)
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.6, 10.2), busPaint);
    body.position.y = 1.7;
    body.castShadow = true;
    body.receiveShadow = true;
    chassis.add(body);

    // 2. Continuous panoramic tinted windows
    const sideWindowsL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 8.8), mats.glass);
    sideWindowsL.position.set(-1.26, 2.05, -0.2);
    chassis.add(sideWindowsL);

    const sideWindowsR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 8.8), mats.glass);
    sideWindowsR.position.set(1.26, 2.05, -0.2);
    chassis.add(sideWindowsR);

    // Windshield (Front)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.1), mats.glass);
    windshield.position.set(0, 2.1, 5.08);
    chassis.add(windshield);

    // Destination Signboard ("EARTHDRIVE METRO")
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.35, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x050505,
        emissive: 0x22ee88,
        emissiveIntensity: 0.9
      })
    );
    signBoard.position.set(0, 2.8, 5.12);
    chassis.add(signBoard);

    // Roof air conditioners
    [-1.8, 1.8].forEach(z => {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.6), mats.carbon);
      ac.position.set(0, 3.12, z);
      chassis.add(ac);
    });

    // Headlights
    const headlightMeshes = [];
    [-0.9, 0.9].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), mats.headlightOn);
      hl.position.set(x, 0.9, 5.12);
      chassis.add(hl);
      headlightMeshes.push(hl);
    });

    const leftLight = new THREE.SpotLight(0xfff8e8, 3.0, 55, Math.PI / 4, 0.35, 1.2);
    leftLight.position.set(-0.9, 1.0, 5.1);
    leftLight.target.position.set(-0.9, 0.2, 35);
    chassis.add(leftLight);
    chassis.add(leftLight.target);

    const rightLight = new THREE.SpotLight(0xfff8e8, 3.0, 55, Math.PI / 4, 0.35, 1.2);
    rightLight.position.set(0.9, 1.0, 5.1);
    rightLight.target.position.set(0.9, 0.2, 35);
    chassis.add(rightLight);
    chassis.add(rightLight.target);

    // Taillights
    const taillightBar = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 0.1), mats.taillightNormal);
    taillightBar.position.set(0, 0.9, -5.12);
    chassis.add(taillightBar);

    // 6 Wheels (2 front, 4 rear dual-axle)
    const wheels = [];
    const wheelPositions = [
      { x: -1.2, y: 0.52, z: 3.4, isFront: true },
      { x: 1.2, y: 0.52, z: 3.4, isFront: true },
      { x: -1.2, y: 0.52, z: -2.4, isFront: false },
      { x: 1.2, y: 0.52, z: -2.4, isFront: false },
      { x: -1.2, y: 0.52, z: -3.8, isFront: false },
      { x: 1.2, y: 0.52, z: -3.8, isFront: false }
    ];

    wheelPositions.forEach(pos => {
      const pivot = new THREE.Group();
      pivot.position.set(pos.x, pos.y, pos.z);
      group.add(pivot);

      const rollHub = new THREE.Group();
      pivot.add(rollHub);

      const tireGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tireMesh = new THREE.Mesh(tireGeo, mats.tire);
      tireMesh.castShadow = true;
      rollHub.add(tireMesh);

      const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.36, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMesh = new THREE.Mesh(rimGeo, mats.rim);
      rollHub.add(rimMesh);

      wheels.push({
        pivot,
        rollHub,
        isFront: pos.isFront,
        isRight: pos.x > 0,
        radius: 0.5
      });
    });

    return {
      root: group,
      chassis,
      wheels,
      mats,
      lights: {
        left: leftLight,
        right: rightLight,
        headlights: headlightMeshes,
        taillightBar
      }
    };
  }

  /**
   * Builds the High-Speed Bullet Train
   */
  static buildBulletTrain() {
    const mats = this.createMaterials();
    const group = new THREE.Group();
    group.name = 'bullet-train';

    const trainPaint = new THREE.MeshStandardMaterial({
      color: 0xf4f6f8,
      metalness: 0.8,
      roughness: 0.2
    });
    const trainStripe = new THREE.MeshStandardMaterial({
      color: 0x0066cc,
      metalness: 0.6,
      roughness: 0.3
    });

    const chassis = new THREE.Group();
    group.add(chassis);

    // Train Body (14m long)
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 11), trainPaint);
    body.position.set(0, 1.8, -1.0);
    body.castShadow = true;
    chassis.add(body);

    // Aerodynamic Nose cone (Front wedge)
    const noseGeo = new THREE.ConeGeometry(1.6, 4.0, 16);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, trainPaint);
    nose.scale.set(0.85, 0.65, 1.0);
    nose.position.set(0, 1.55, 6.2);
    chassis.add(nose);

    // Racing Blue / Red stripe along body
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.25, 12), trainStripe);
    stripe.position.set(0, 1.5, 0);
    chassis.add(stripe);

    // Cockpit & side windows
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.6, 9.5), mats.glass);
    win.position.set(0, 2.2, -0.8);
    chassis.add(win);

    // Roof Pantograph
    const panto = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.4), mats.carbon);
    panto.position.set(0, 3.3, -4.0);
    chassis.add(panto);

    // Powerful Center Headlight
    const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), mats.headlightOn);
    headlight.position.set(0, 1.6, 7.8);
    chassis.add(headlight);

    const beam = new THREE.SpotLight(0xffffff, 4.5, 90, Math.PI / 6, 0.2, 1.0);
    beam.position.set(0, 1.6, 7.8);
    beam.target.position.set(0, 0, 60);
    chassis.add(beam);
    chassis.add(beam.target);

    // Bogie steel rail wheels (hidden under skirts)
    const wheels = [];
    [-4, -2, 2, 4].forEach(z => {
      [-1.1, 1.1].forEach(x => {
        const pivot = new THREE.Group();
        pivot.position.set(x, 0.45, z);
        group.add(pivot);

        const rollHub = new THREE.Group();
        pivot.add(rollHub);

        const wheelMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 0.16, 16).rotateZ(Math.PI / 2),
          mats.rim
        );
        rollHub.add(wheelMesh);

        wheels.push({
          pivot,
          rollHub,
          isFront: z > 0,
          radius: 0.42
        });
      });
    });

    return {
      root: group,
      chassis,
      wheels,
      mats,
      lights: {
        left: beam,
        right: beam,
        headlights: [headlight],
        taillightBar: null
      }
    };
  }

  /**
   * Builds the Supersonic Jet Airplane
   */
  static buildAirplane() {
    const mats = this.createMaterials();
    const group = new THREE.Group();
    group.name = 'airplane';

    const jetPaint = new THREE.MeshStandardMaterial({
      color: 0x242830, // Stealth matte titanium
      metalness: 0.7,
      roughness: 0.35
    });
    const afterburner = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff3300,
      emissiveIntensity: 2.5
    });

    const chassis = new THREE.Group();
    group.add(chassis);

    // Fuselage (Cylinder along Z)
    const bodyGeo = new THREE.CylinderGeometry(0.65, 0.85, 9.2, 16);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, jetPaint);
    body.position.y = 1.0;
    body.castShadow = true;
    chassis.add(body);

    // Radome / Needle Nose
    const noseGeo = new THREE.ConeGeometry(0.65, 2.8, 16);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, jetPaint);
    nose.position.set(0, 1.0, 5.8);
    chassis.add(nose);

    // Cockpit Bubble Canopy
    const canopyGeo = new THREE.SphereGeometry(0.55, 16, 16);
    canopyGeo.scale(0.85, 0.9, 2.2);
    const canopy = new THREE.Mesh(canopyGeo, mats.glass);
    canopy.position.set(0, 1.5, 2.8);
    chassis.add(canopy);

    // Swept Delta Main Wings
    const wingGeo = new THREE.BoxGeometry(8.2, 0.08, 2.8);
    const wings = new THREE.Mesh(wingGeo, jetPaint);
    wings.position.set(0, 0.95, -0.4);
    wings.rotation.y = 0;
    wings.castShadow = true;
    chassis.add(wings);

    // Twin Vertical Stabilizer Fins
    [-1.2, 1.2].forEach(x => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 1.4), jetPaint);
      fin.position.set(x, 1.9, -3.8);
      fin.rotation.z = (x > 0 ? -1 : 1) * 0.22;
      chassis.add(fin);
    });

    // Twin Jet Engine Exhaust Nozzles
    const exhaustPipes = [];
    [-0.5, 0.5].forEach(x => {
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 0.8, 16).rotateX(Math.PI / 2),
        afterburner
      );
      nozzle.position.set(x, 0.95, -4.8);
      chassis.add(nozzle);
      exhaustPipes.push(nozzle);
    });

    // Wheels (tricycle landing gear)
    const wheels = [];
    const gearPositions = [
      { x: 0, y: 0.35, z: 2.8, isFront: true },
      { x: -1.6, y: 0.35, z: -0.6, isFront: false },
      { x: 1.6, y: 0.35, z: -0.6, isFront: false }
    ];

    gearPositions.forEach(pos => {
      const pivot = new THREE.Group();
      pivot.position.set(pos.x, pos.y, pos.z);
      group.add(pivot);

      const rollHub = new THREE.Group();
      pivot.add(rollHub);

      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16).rotateZ(Math.PI / 2),
        mats.tire
      );
      rollHub.add(wheel);

      wheels.push({
        pivot,
        rollHub,
        isFront: pos.isFront,
        radius: 0.3
      });
    });

    return {
      root: group,
      chassis,
      wheels,
      mats,
      lights: {
        left: null,
        right: null,
        headlights: [],
        taillightBar: null
      },
      exhaustPipes
    };
  }
}

window.VehicleFactory = VehicleFactory;
