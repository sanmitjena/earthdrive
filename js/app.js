/**
 * EarthDrive Main Application Controller
 * Orchestrates Three.js rendering, physics ticking, multi-camera views,
 * UI instruments, sound synchronization, and mobile touch interactions.
 */

class EarthDriveApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.keys = new Set();
    this.mobileInputs = {
      forward: false,
      back: false,
      left: false,
      right: false,
      handbrake: false
    };

    // Camera modes: 0 = Chase Cam, 1 = Cockpit, 2 = Hood/Bumper, 3 = Drone/Orbit
    this.cameraMode = 0;
    this.cameraModes = ['CHASE', 'COCKPIT', 'HOOD', 'DRONE'];

    // Subsystems
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.physics = null;
    this.world = null;
    this.weather = null;
    this.minimap = null;

    // Current active vehicle 3D model
    this.vehicleType = 'car';
    this.currentVehicle = null;
    this.vehicleInstances = {};

    this.headlightsActive = true;
    this.isPaused = false;
    this.lastTime = performance.now();

    // Smoothed camera target vectors
    this.camPos = new THREE.Vector3(0, 5, -12);
    this.camLook = new THREE.Vector3(0, 1, 0);

    this.init();
  }

  init() {
    this.initThree();
    this.initSubsystems();
    this.initVehicleModels();
    this.switchVehicle('car');

    this.initEventHandlers();
    this.initUI();

    // Start loop
    requestAnimationFrame(this.loop.bind(this));
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      8000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  initSubsystems() {
    this.physics = new PhysicsEngine();
    window.physicsEngine = this.physics;

    this.world = new WorldEngine(this.scene);
    window.worldEngine = this.world;

    this.weather = new WeatherEngine(this.scene, this.renderer);
    window.weatherEngine = this.weather;

    this.minimap = new MiniMap('minimap-canvas');

    // Build initial procedural world
    this.world.buildProceduralWorld();
  }

  initVehicleModels() {
    // Build all 4 vehicles upfront for instantaneous switching
    this.vehicleInstances.car = VehicleFactory.buildSupercar();
    this.vehicleInstances.bus = VehicleFactory.buildBus();
    this.vehicleInstances.train = VehicleFactory.buildBulletTrain();
    this.vehicleInstances.plane = VehicleFactory.buildAirplane();

    Object.values(this.vehicleInstances).forEach(v => {
      v.root.visible = false;
      this.scene.add(v.root);
    });
  }

  switchVehicle(type) {
    if (!this.vehicleInstances[type]) return;

    // Hide old
    if (this.currentVehicle) {
      this.currentVehicle.root.visible = false;
    }

    this.vehicleType = type;
    this.currentVehicle = this.vehicleInstances[type];
    this.currentVehicle.root.visible = true;

    this.physics.setVehicleType(type);

    // Update HUD vehicle button states
    document.querySelectorAll('.vehicle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.vehicle === type);
    });

    // Update vehicle name tag
    const titles = {
      car: 'Apex GT Supercar',
      bus: 'Metro Cruiser Bus',
      train: 'Shinkansen Bullet Train',
      plane: 'Supersonic Jet Fighter'
    };
    const el = document.getElementById('vehicle-name');
    if (el) el.textContent = titles[type] || type.toUpperCase();
  }

  initEventHandlers() {
    // Keyboard
    window.addEventListener('keydown', e => {
      this.keys.add(e.code);

      // Unlock AudioContext on first keypress
      if (window.soundEngine) {
        window.soundEngine.init();
        window.soundEngine.resume();
      }

      // Hotkeys
      if (e.code === 'KeyC') {
        this.cycleCamera();
      } else if (e.code === 'KeyH') {
        if (window.soundEngine) window.soundEngine.startHorn();
      } else if (e.code === 'KeyL') {
        this.toggleHeadlights();
      } else if (e.code === 'KeyR') {
        this.resetVehicle();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
      if (e.code === 'KeyH' && window.soundEngine) {
        window.soundEngine.stopHorn();
      }
    });

    // First user gesture anywhere resumes audio
    ['click', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, () => {
        if (window.soundEngine) {
          window.soundEngine.init();
          window.soundEngine.resume();
        }
      }, { once: true });
    });
  }

  initUI() {
    // Start button / audio unlock
    const startBtn = document.getElementById('start-btn');
    const startOverlay = document.getElementById('start-overlay');
    if (startBtn && startOverlay) {
      startBtn.addEventListener('click', () => {
        startOverlay.classList.add('dismissed');
        if (window.soundEngine) {
          window.soundEngine.init();
          window.soundEngine.resume();
        }
      });
    }

    // Vehicle selector buttons
    document.querySelectorAll('.vehicle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchVehicle(btn.dataset.vehicle);
      });
    });

    // Time of Day buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.weather.setTimePreset(btn.dataset.time);
      });
    });

    // Weather buttons
    document.querySelectorAll('.weather-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.weather.setWeatherPreset(btn.dataset.weather);
      });
    });

    // Camera toggle button
    const camBtn = document.getElementById('cam-btn');
    if (camBtn) {
      camBtn.addEventListener('click', () => this.cycleCamera());
    }

    // Audio Mute toggle button
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = window.soundEngine.toggleMute();
        muteBtn.textContent = isMuted ? '🔇 Audio Off' : '🔊 Audio On';
        muteBtn.classList.toggle('muted', isMuted);
      });
    }

    // Destinations Modal
    const destModal = document.getElementById('destinations-modal');
    const openDestBtn = document.getElementById('open-destinations-btn');
    const closeDestBtn = document.getElementById('close-destinations-btn');

    if (openDestBtn && destModal) {
      openDestBtn.addEventListener('click', () => destModal.classList.remove('hidden'));
    }
    if (closeDestBtn && destModal) {
      closeDestBtn.addEventListener('click', () => destModal.classList.add('hidden'));
    }

    // Populate Destination list
    const destList = document.getElementById('destinations-list');
    if (destList) {
      WORLD_DESTINATIONS.forEach(dest => {
        const item = document.createElement('div');
        item.className = 'destination-card';
        item.innerHTML = `
          <div class="dest-info">
            <h4>${dest.name}</h4>
            <p>${dest.desc}</p>
            <span class="dest-coords">${dest.lat.toFixed(4)}°N, ${dest.lon.toFixed(4)}°E</span>
          </div>
          <button class="teleport-btn">Drive Here</button>
        `;
        item.querySelector('.teleport-btn').addEventListener('click', () => {
          this.teleportToDestination(dest);
          destModal.classList.add('hidden');
        });
        destList.appendChild(item);
      });
    }

    // Custom Search / Coordinates Input
    const searchBtn = document.getElementById('search-coord-btn');
    const searchInput = document.getElementById('search-coord-input');
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        this.handleCustomSearch(query);
        destModal.classList.add('hidden');
      });
    }

    // Mobile Virtual Touch Controls
    this.initMobileControls();
  }

  initMobileControls() {
    const bindTouch = (elemId, inputKey) => {
      const el = document.getElementById(elemId);
      if (!el) return;
      const start = e => { e.preventDefault(); this.mobileInputs[inputKey] = true; el.classList.add('pressed'); };
      const end = e => { e.preventDefault(); this.mobileInputs[inputKey] = false; el.classList.remove('pressed'); };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', end);
    };

    bindTouch('touch-gas', 'forward');
    bindTouch('touch-brake', 'back');
    bindTouch('touch-left', 'left');
    bindTouch('touch-right', 'right');
    bindTouch('touch-handbrake', 'handbrake');

    const touchHorn = document.getElementById('touch-horn');
    if (touchHorn) {
      touchHorn.addEventListener('touchstart', () => window.soundEngine && window.soundEngine.startHorn());
      touchHorn.addEventListener('touchend', () => window.soundEngine && window.soundEngine.stopHorn());
      touchHorn.addEventListener('mousedown', () => window.soundEngine && window.soundEngine.startHorn());
      touchHorn.addEventListener('mouseup', () => window.soundEngine && window.soundEngine.stopHorn());
    }
  }

  cycleCamera() {
    this.cameraMode = (this.cameraMode + 1) % this.cameraModes.length;
    const modeName = this.cameraModes[this.cameraMode];
    const badge = document.getElementById('cam-label');
    if (badge) badge.textContent = modeName;
  }

  toggleHeadlights() {
    this.headlightsActive = !this.headlightsActive;
    if (this.currentVehicle && this.currentVehicle.lights) {
      const { left, right, headlights } = this.currentVehicle.lights;
      if (left) left.visible = this.headlightsActive;
      if (right) right.visible = this.headlightsActive;
      headlights.forEach(h => {
        h.material = this.headlightsActive
          ? this.currentVehicle.mats.headlightOn
          : this.currentVehicle.mats.headlightOff;
      });
    }
    const indicator = document.getElementById('headlight-indicator');
    if (indicator) indicator.classList.toggle('active', this.headlightsActive);
  }

  resetVehicle() {
    this.physics.reset(0, 0, 0);
  }

  async teleportToDestination(dest) {
    const banner = document.getElementById('location-banner');
    if (banner) banner.textContent = `Loading ${dest.name}…`;

    this.physics.reset(0, 0, 0);

    // Try OSM real road data first
    const success = await this.world.loadOsmDestination(dest.lat, dest.lon);
    if (!success) {
      this.world.buildProceduralWorld(dest.id);
    }

    if (banner) banner.textContent = dest.name;
    const descEl = document.getElementById('location-desc');
    if (descEl) descEl.textContent = dest.desc;
  }

  async handleCustomSearch(query) {
    if (!query) return;
    const banner = document.getElementById('location-banner');
    if (banner) banner.textContent = `Searching "${query}"…`;

    // Check if coordinates
    const coordMatch = query.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    let lat, lon;
    if (coordMatch) {
      lat = parseFloat(coordMatch[1]);
      lon = parseFloat(coordMatch[3]);
    } else {
      // Nominatim OpenStreetMap Geocoder
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await resp.json();
        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lon = parseFloat(data[0].lon);
        } else {
          alert('Location not found. Please try another place name or coordinates.');
          return;
        }
      } catch (e) {
        console.warn('Geocoding failed:', e);
        return;
      }
    }

    this.physics.reset(0, 0, 0);
    const success = await this.world.loadOsmDestination(lat, lon);
    if (!success) {
      this.world.buildProceduralWorld();
    }
    if (banner) banner.textContent = query;
  }

  gatherInput() {
    return {
      forward: this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.mobileInputs.forward,
      back: this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.mobileInputs.back,
      left: this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.mobileInputs.left,
      right: this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.mobileInputs.right,
      handbrake: this.keys.has('Space') || this.mobileInputs.handbrake,
      pitchUp: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      pitchDown: this.keys.has('KeyW') || this.keys.has('ArrowUp')
    };
  }

  loop(timestamp) {
    requestAnimationFrame(this.loop.bind(this));

    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.isPaused) return;

    // 1. Gather inputs & tick Physics
    const input = this.gatherInput();
    const physState = this.physics.update(input, dt, (x, z) => this.world.getGroundHeight(x, z));

    // 2. Update 3D Vehicle representation
    this.updateVehicleModel(physState, input, dt);

    // 3. Update Camera
    this.updateCamera(physState, dt);

    // 4. Update World (Traffic, Weather, Sun shadows)
    this.world.updateTraffic(dt);
    this.weather.update({ x: physState.x, y: physState.y, z: physState.z }, dt);

    // 5. Update Audio Engine
    if (window.soundEngine) {
      window.soundEngine.update({
        speedKmh: physState.speedKmh,
        rpmNorm: physState.rpmNorm,
        throttle: input.forward ? 1.0 : 0.0,
        slipAmount: Math.abs(physState.slip),
        gear: physState.gear,
        vehicleType: this.vehicleType
      });
    }

    // 6. Update Tactical Mini-Map
    this.minimap.update(
      { x: physState.x, z: physState.z },
      physState.heading,
      this.world.roads,
      this.world.trafficCars
    );

    // 7. Update HUD Instruments
    this.updateHUD(physState, input);

    // 8. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  updateVehicleModel(physState, input, dt) {
    if (!this.currentVehicle) return;
    const v = this.currentVehicle;

    // Position & Orientation
    v.root.position.set(physState.x, physState.y, physState.z);
    v.root.rotation.order = 'YXZ';
    v.root.rotation.y = physState.heading;

    // Suspension Body Pitch & Roll applied to chassis
    if (v.chassis) {
      v.chassis.rotation.x = physState.pitch;
      v.chassis.rotation.z = physState.roll;
    }

    // Wheel Steering & Spinning
    if (v.wheels) {
      const travelDist = (physState.speedKmh / 3.6) * dt;
      v.wheels.forEach(w => {
        // Front steering pivot
        if (w.isFront && w.pivot) {
          w.pivot.rotation.y = this.physics.steer;
        }
        // Rolling around X axis
        if (w.rollHub) {
          const rotationAngle = travelDist / (w.radius || 0.35);
          w.rollHub.rotation.x += rotationAngle;
        }
      });
    }

    // Taillight Brake Flare
    if (v.lights && v.lights.taillightBar) {
      const isBraking = input.back && physState.speedKmh > 1;
      v.lights.taillightBar.material = isBraking
        ? v.mats.taillightBraking
        : v.mats.taillightNormal;
    }

    // Visibility in Cockpit Cam (hide vehicle so it doesn't block driver view)
    v.root.visible = this.cameraMode !== 1;
  }

  updateCamera(physState, dt) {
    const heading = physState.heading;
    const sinH = Math.sin(heading);
    const cosH = Math.cos(heading);

    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();

    if (this.cameraMode === 0) {
      // 1. Chase Cam (Lagging smooth third-person)
      const dist = this.vehicleType === 'plane' ? 18 : this.vehicleType === 'bus' ? 14 : 9.5;
      const height = this.vehicleType === 'plane' ? 5.5 : this.vehicleType === 'bus' ? 4.8 : 3.4;

      targetCamPos.set(
        physState.x - sinH * dist,
        physState.y + height,
        physState.z - cosH * dist
      );

      // Look slightly ahead of car
      targetLookAt.set(
        physState.x + sinH * 6,
        physState.y + 1.2,
        physState.z + cosH * 6
      );
    } else if (this.cameraMode === 1) {
      // 2. Cockpit / Driver View
      const eyeHeight = this.vehicleType === 'bus' ? 2.4 : 1.15;
      const eyeZ = this.vehicleType === 'bus' ? 4.2 : 0.2;
      const eyeX = this.vehicleType === 'bus' ? -0.6 : -0.38; // driver seat on left

      targetCamPos.set(
        physState.x + sinH * eyeZ + cosH * eyeX,
        physState.y + eyeHeight,
        physState.z + cosH * eyeZ - sinH * eyeX
      );

      targetLookAt.set(
        physState.x + sinH * 40,
        physState.y + eyeHeight,
        physState.z + cosH * 40
      );
    } else if (this.cameraMode === 2) {
      // 3. Hood / Bumper Cam (Extreme road-level adrenaline)
      targetCamPos.set(
        physState.x + sinH * 1.8,
        physState.y + 0.65,
        physState.z + cosH * 1.8
      );

      targetLookAt.set(
        physState.x + sinH * 35,
        physState.y + 0.5,
        physState.z + cosH * 35
      );
    } else if (this.cameraMode === 3) {
      // 4. Drone / Orbit Cam (Cinematic aerial tracking)
      const time = performance.now() * 0.0004;
      const orbitDist = 18;
      targetCamPos.set(
        physState.x + Math.sin(time) * orbitDist,
        physState.y + 8.5,
        physState.z + Math.cos(time) * orbitDist
      );

      targetLookAt.set(physState.x, physState.y + 1.0, physState.z);
    }

    // Apply Camera Shake if collision occurred
    if (this.physics.shakeIntensity > 0) {
      const s = this.physics.shakeIntensity * 0.35;
      targetCamPos.x += (Math.random() - 0.5) * s;
      targetCamPos.y += (Math.random() - 0.5) * s;
      targetCamPos.z += (Math.random() - 0.5) * s;
    }

    // Smooth camera damping
    const lerpRate = this.cameraMode === 1 ? 0.95 : 0.12;
    this.camPos.lerp(targetCamPos, lerpRate);
    this.camLook.lerp(targetLookAt, lerpRate);

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  updateHUD(physState, input) {
    const speed = Math.round(Math.abs(physState.speedKmh));
    const speedEl = document.getElementById('hud-speed');
    if (speedEl) speedEl.textContent = speed;

    // Analog needle rotation (0 to 300 km/h maps to -125deg to +125deg)
    const needleEl = document.getElementById('speedo-needle');
    if (needleEl) {
      const angle = -125 + Math.min(1.0, speed / 300) * 250;
      needleEl.style.transform = `rotate(${angle}deg)`;
    }

    // RPM gauge bar
    const rpmBar = document.getElementById('rpm-bar-fill');
    if (rpmBar) {
      rpmBar.style.width = `${Math.min(100, Math.max(8, physState.rpmNorm * 100))}%`;
    }

    // Gear indicator
    const gearEl = document.getElementById('hud-gear');
    if (gearEl) gearEl.textContent = physState.gear;

    // Trip distance
    const tripEl = document.getElementById('hud-trip');
    if (tripEl) tripEl.textContent = `${(physState.tripDistance / 1000).toFixed(2)} km`;

    // Drift / Slip warning indicator
    const driftBadge = document.getElementById('drift-badge');
    if (driftBadge) {
      driftBadge.classList.toggle('active', Math.abs(physState.slip) > 1.2);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.earthDriveApp = new EarthDriveApp();
});
