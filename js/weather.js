/**
 * EarthDrive Weather & Environment Engine
 * - Day / Sunset / Night / Dawn lighting models
 * - Dynamic Sun & Moon directional lighting with soft shadows
 * - 3D Particle Rain system with road wetness sheen
 * - Atmospheric fog & headlight/streetlight synchronization
 */

class WeatherEngine {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.currentTimePreset = 'sunset'; // 'day' | 'sunset' | 'night' | 'dawn'
    this.currentWeatherPreset = 'clear'; // 'clear' | 'rain' | 'fog'

    // Lighting nodes
    this.hemiLight = null;
    this.sunLight = null;
    this.ambientLight = null;

    // Rain particles
    this.rainParticles = null;
    this.rainCount = 3500;

    this.initLights();
    this.initRain();
    this.setTimePreset('sunset');
  }

  initLights() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    this.hemiLight.position.set(0, 500, 0);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0dd, 2.5);
    this.sunLight.position.set(250, 400, 150);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1200;
    const d = 180;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
  }

  initRain() {
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 300;
      rainPositions[i * 3 + 1] = Math.random() * 80;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x90c5e6,
      size: 0.35,
      transparent: true,
      opacity: 0.65
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  setTimePreset(preset) {
    this.currentTimePreset = preset;

    if (preset === 'day') {
      this.scene.background = new THREE.Color(0x89b6dc);
      this.scene.fog = new THREE.FogExp2(0x89b6dc, 0.0007);

      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0x556644);
      this.hemiLight.intensity = 1.4;

      this.ambientLight.intensity = 0.5;
      this.sunLight.color.setHex(0xfffaed);
      this.sunLight.intensity = 2.6;
      this.sunLight.position.set(200, 450, 150);

      this.updateEmissives(false);
    } else if (preset === 'sunset') {
      this.scene.background = new THREE.Color(0xda734f);
      this.scene.fog = new THREE.FogExp2(0xda734f, 0.001);

      this.hemiLight.color.setHex(0xff8855);
      this.hemiLight.groundColor.setHex(0x332222);
      this.hemiLight.intensity = 1.2;

      this.ambientLight.intensity = 0.35;
      this.sunLight.color.setHex(0xffaa44);
      this.sunLight.intensity = 3.2;
      this.sunLight.position.set(400, 140, 200);

      this.updateEmissives(false);
    } else if (preset === 'night') {
      this.scene.background = new THREE.Color(0x060912);
      this.scene.fog = new THREE.FogExp2(0x060912, 0.0015);

      this.hemiLight.color.setHex(0x223355);
      this.hemiLight.groundColor.setHex(0x05070e);
      this.hemiLight.intensity = 0.45;

      this.ambientLight.intensity = 0.15;
      this.sunLight.color.setHex(0x5577aa); // Soft moonlight
      this.sunLight.intensity = 0.8;
      this.sunLight.position.set(-150, 300, -100);

      this.updateEmissives(true);
    } else if (preset === 'dawn') {
      this.scene.background = new THREE.Color(0x7e6990);
      this.scene.fog = new THREE.FogExp2(0x7e6990, 0.0012);

      this.hemiLight.color.setHex(0xddaacc);
      this.hemiLight.groundColor.setHex(0x222233);
      this.hemiLight.intensity = 0.9;

      this.ambientLight.intensity = 0.3;
      this.sunLight.color.setHex(0xffbb99);
      this.sunLight.intensity = 2.0;
      this.sunLight.position.set(-350, 160, 100);

      this.updateEmissives(false);
    }
  }

  setWeatherPreset(weather) {
    this.currentWeatherPreset = weather;

    if (weather === 'clear') {
      this.rainParticles.visible = false;
      this.setTimePreset(this.currentTimePreset);
    } else if (weather === 'rain') {
      this.rainParticles.visible = true;
      this.scene.fog.density = 0.0022;
      this.hemiLight.intensity *= 0.7;
      this.sunLight.intensity *= 0.5;
    } else if (weather === 'fog') {
      this.rainParticles.visible = false;
      this.scene.fog.density = 0.0055; // Dense cinematic mist
      this.sunLight.intensity *= 0.4;
    }
  }

  updateEmissives(isNight) {
    if (!window.worldEngine) return;

    // Toggle streetlight bulbs
    window.worldEngine.streetlights.forEach(lamp => {
      lamp.bulb.material.emissiveIntensity = isNight ? 3.5 : 0.0;
    });

    // Window lighting
    window.worldEngine.materials.windowGlow.emissiveIntensity = isNight ? 1.6 : 0.4;
  }

  update(playerPos, dt) {
    // Keep Sun and shadow camera centered around the player vehicle
    this.sunLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
    this.sunLight.position.set(
      playerPos.x + 250,
      playerPos.y + 400,
      playerPos.z + 150
    );

    // Update Rain particles around player
    if (this.rainParticles.visible) {
      const pos = this.rainParticles.geometry.attributes.position;
      for (let i = 0; i < this.rainCount; i++) {
        let y = pos.getY(i) - dt * 65.0; // Fast falling speed
        if (y < 0) {
          y = 70;
          pos.setX(i, playerPos.x + (Math.random() - 0.5) * 220);
          pos.setZ(i, playerPos.z + (Math.random() - 0.5) * 220);
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  }
}

window.WeatherEngine = WeatherEngine;
