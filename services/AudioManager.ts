export class AudioManager {
  ctx: AudioContext;
  masterGain: GainNode;
  
  // Oscillators/Nodes for loops
  thrusterGain: GainNode | null = null;
  thrusterOsc: AudioBufferSourceNode | null = null;
  
  laserGain: GainNode | null = null;
  laserOsc: OscillatorNode | null = null;

  tractorGain: GainNode | null = null;
  tractorOsc: OscillatorNode | null = null;
  tractorLfo: OscillatorNode | null = null;

  isMuted: boolean = false;

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.2; // Master volume
    this.masterGain.connect(this.ctx.destination);
    
    this.initLoops();
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initLoops() {
    // 1. Thruster Loop Setup (Brownish Noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.thrusterGain = this.ctx.createGain();
    this.thrusterGain.gain.value = 0;
    
    // Lowpass filter for rumble
    const thrusterFilter = this.ctx.createBiquadFilter();
    thrusterFilter.type = 'lowpass';
    thrusterFilter.frequency.value = 300;

    this.thrusterOsc = this.ctx.createBufferSource();
    this.thrusterOsc.buffer = buffer;
    this.thrusterOsc.loop = true;
    
    this.thrusterOsc.connect(thrusterFilter);
    thrusterFilter.connect(this.thrusterGain);
    this.thrusterGain.connect(this.masterGain);
    this.thrusterOsc.start();

    // 2. Laser Loop Setup
    this.laserGain = this.ctx.createGain();
    this.laserGain.gain.value = 0;

    this.laserOsc = this.ctx.createOscillator();
    this.laserOsc.type = 'sawtooth';
    this.laserOsc.frequency.value = 150; // Low buzz

    // Highpass to thin it out a bit
    const laserFilter = this.ctx.createBiquadFilter();
    laserFilter.type = 'highpass';
    laserFilter.frequency.value = 800;

    this.laserOsc.connect(laserFilter);
    laserFilter.connect(this.laserGain);
    this.laserGain.connect(this.masterGain);
    this.laserOsc.start();

    // 3. Tractor Loop Setup
    this.tractorGain = this.ctx.createGain();
    this.tractorGain.gain.value = 0;

    this.tractorOsc = this.ctx.createOscillator();
    this.tractorOsc.type = 'sine';
    this.tractorOsc.frequency.value = 100;

    this.tractorLfo = this.ctx.createOscillator();
    this.tractorLfo.type = 'sine';
    this.tractorLfo.frequency.value = 10; // Wobble speed
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 500; // Wobble depth

    this.tractorLfo.connect(lfoGain);
    lfoGain.connect(this.tractorOsc.frequency);
    
    this.tractorOsc.connect(this.tractorGain);
    this.tractorGain.connect(this.masterGain);
    
    this.tractorOsc.start();
    this.tractorLfo.start();
  }

  setThruster(active: boolean) {
    if (!this.thrusterGain) return;
    const now = this.ctx.currentTime;
    const target = active ? 0.8 : 0;
    this.thrusterGain.gain.setTargetAtTime(target, now, 0.1);
  }

  setLaser(active: boolean) {
    if (!this.laserGain) return;
    const now = this.ctx.currentTime;
    // Slight frequency modulation for laser intensity?
    if (active && this.laserOsc) {
         this.laserOsc.frequency.setValueAtTime(150 + Math.random() * 50, now);
    }
    const target = active ? 0.3 : 0;
    this.laserGain.gain.setTargetAtTime(target, now, 0.05);
  }

  setTractor(active: boolean) {
    if (!this.tractorGain) return;
    const now = this.ctx.currentTime;
    const target = active ? 0.3 : 0;
    this.tractorGain.gain.setTargetAtTime(target, now, 0.2);
  }

  playExplosion(size: 'small' | 'medium' | 'large') {
    this.resume();
    const t = this.ctx.currentTime;
    
    // 1. Noise Burst (Crunch)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1000, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSrc.start();

    // 2. Low Sine (Thud) - Only for medium/large
    if (size !== 'small') {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
        
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.8, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start();
        osc.stop(t + 0.6);
    }
  }

  playCollect() {
    this.resume();
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.1); // A6

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(t + 0.2);
  }
}