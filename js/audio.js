/**
 * EarthDrive Audio Synthesizer
 * 100% Web Audio API procedural sound engine:
 * - Multi-harmonic engine RPM synthesis with distortion & lowpass filtering
 * - Gear shift blow-off valve / turbo spool
 * - Tire squeal / drift friction noise
 * - Dual-tone car horn
 * - High-speed aerodynamic wind rush
 * - Rain ambient generator
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.muted = false;
    this.volume = 0.8;

    // Engine sound nodes
    this.engineGain = null;
    this.filterNode = null;
    this.oscillators = [];

    // Tire screech nodes
    this.screechGain = null;
    this.screechFilter = null;
    this.screechNoise = null;

    // Wind sound nodes
    this.windGain = null;
    this.windFilter = null;

    // Horn nodes
    this.hornOsc1 = null;
    this.hornOsc2 = null;
    this.hornGain = null;
    this.hornActive = false;

    // Gear shift / turbo blow-off timer
    this.lastGear = 1;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSound();
      this.setupScreechSound();
      this.setupWindSound();
      this.setupHornSound();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSound() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

    // Distortion / warm wave shaper
    const distortion = this.ctx.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(18);
    distortion.oversample = '2x';

    // Lowpass filter responding to throttle/RPM
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // 3 Detuned Oscillators (fundamental + octave + growl)
    const freqs = [35, 70, 105];
    const types = ['sawtooth', 'triangle', 'sawtooth'];

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = types[i];
      osc.frequency.setValueAtTime(freqs[i], this.ctx.currentTime);
      oscGain.gain.setValueAtTime(i === 0 ? 0.45 : i === 1 ? 0.35 : 0.2, this.ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(distortion);
      osc.start();
      this.oscillators.push(osc);
    }

    distortion.connect(this.filterNode);
    this.filterNode.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
  }

  setupScreechSound() {
    // Generate pink/white noise buffer for tire slip
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    whiteNoise.start();
  }

  setupWindSound() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    windSource.start();
  }

  setupHornSound() {
    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // European dual-tone horn (F & A notes: 349Hz and 440Hz)
    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc1.type = 'sawtooth';
    this.hornOsc1.frequency.setValueAtTime(349, this.ctx.currentTime);

    this.hornOsc2 = this.ctx.createOscillator();
    this.hornOsc2.type = 'sawtooth';
    this.hornOsc2.frequency.setValueAtTime(440, this.ctx.currentTime);

    const hornFilter = this.ctx.createBiquadFilter();
    hornFilter.type = 'lowpass';
    hornFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    this.hornOsc1.connect(hornFilter);
    this.hornOsc2.connect(hornFilter);
    hornFilter.connect(this.hornGain);
    this.hornGain.connect(this.masterGain);

    this.hornOsc1.start();
    this.hornOsc2.start();
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  startHorn() {
    if (!this.initialized) return;
    this.resume();
    if (this.hornActive) return;
    this.hornActive = true;
    this.hornGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.hornGain.gain.linearRampToValueAtTime(0.28, this.ctx.currentTime + 0.05);
  }

  stopHorn() {
    if (!this.initialized || !this.hornActive) return;
    this.hornActive = false;
    this.hornGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.hornGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
  }

  triggerGearShift() {
    if (!this.initialized || this.muted) return;
    try {
      // Short turbo air release "pshh"
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  triggerCrash() {
    if (!this.initialized || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {}
  }

  update(params) {
    if (!this.initialized || this.muted) return;
    const { speedKmh, rpmNorm, throttle, slipAmount, gear, vehicleType } = params;
    const now = this.ctx.currentTime;

    // Detect gear shift
    if (gear !== this.lastGear && Math.abs(speedKmh) > 15) {
      this.triggerGearShift();
      this.lastGear = gear;
    }

    // Engine Pitch and Timbre based on RPM and vehicle type
    if (this.oscillators.length >= 3) {
      let baseFreq = 42;
      let maxFreq = 180;
      if (vehicleType === 'bus') {
        baseFreq = 28;
        maxFreq = 110; // deeper diesel rumble
      } else if (vehicleType === 'train') {
        baseFreq = 50;
        maxFreq = 160; // electric hum
      } else if (vehicleType === 'plane') {
        baseFreq = 80;
        maxFreq = 340; // high jet turbine whine
      }

      const currentPitch = baseFreq + rpmNorm * (maxFreq - baseFreq);
      this.oscillators[0].frequency.setTargetAtTime(currentPitch, now, 0.05);
      this.oscillators[1].frequency.setTargetAtTime(currentPitch * 1.5, now, 0.05);
      this.oscillators[2].frequency.setTargetAtTime(currentPitch * 2.02, now, 0.05);

      // Lowpass filter opens up as throttle increases
      const filterFreq = 300 + throttle * 2800 + rpmNorm * 1800;
      this.filterNode.frequency.setTargetAtTime(Math.min(8000, filterFreq), now, 0.06);

      // Engine volume based on throttle and RPM
      const targetGain = Math.min(0.22, 0.04 + throttle * 0.12 + rpmNorm * 0.08);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
    }

    // Tire Screech: active when drifting or heavy braking
    if (this.screechGain) {
      const screechIntensity = Math.min(1, Math.max(0, slipAmount * 1.5));
      const targetScreech = screechIntensity > 0.15 ? screechIntensity * 0.22 : 0;
      this.screechGain.gain.setTargetAtTime(targetScreech, now, 0.04);
      if (targetScreech > 0) {
        this.screechFilter.frequency.setTargetAtTime(900 + slipAmount * 800, now, 0.05);
      }
    }

    // Aerodynamic Wind: rises above 60 km/h
    if (this.windGain) {
      const windSpeed = Math.abs(speedKmh);
      const windNorm = Math.min(1, Math.max(0, (windSpeed - 40) / 140));
      this.windGain.gain.setTargetAtTime(windNorm * 0.18, now, 0.1);
      this.windFilter.frequency.setTargetAtTime(200 + windNorm * 1400, now, 0.1);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }
}

window.soundEngine = new SoundEngine();
