// Procedural sound effects via the Web Audio API — no asset files. The context
// is created lazily on the first user gesture (required by mobile browsers).

const SOUNDS = {
  jump: { type: 'square', f0: 440, f1: 720, dur: 0.12, gain: 0.18 },
  dash: { type: 'sawtooth', f0: 320, f1: 120, dur: 0.16, gain: 0.16 },
  shoot: { type: 'square', f0: 880, f1: 320, dur: 0.1, gain: 0.14 },
  coin: { type: 'triangle', f0: 880, f1: 1320, dur: 0.12, gain: 0.2 },
  star: { type: 'triangle', f0: 660, f1: 1760, dur: 0.25, gain: 0.22 },
  stomp: { type: 'square', f0: 240, f1: 80, dur: 0.16, gain: 0.22 },
  hurt: { type: 'sawtooth', f0: 300, f1: 90, dur: 0.25, gain: 0.22 },
  win: { type: 'triangle', f0: 523, f1: 1046, dur: 0.5, gain: 0.25 },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Call from a user gesture (click/tap) so mobile browsers allow playback.
  resume() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  play(name) {
    if (this.muted || !this.ctx) return;
    const spec = SOUNDS[name];
    if (!spec) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.f1), t + spec.dur);
    gain.gain.setValueAtTime(spec.gain, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + spec.dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + spec.dur);
  }
}
