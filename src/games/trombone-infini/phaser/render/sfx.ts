export class SfxManager {
  private scene: any;
  private ctx: AudioContext | null = null;
  private muted = false;
  private volume = 0.3;

  constructor(scene: any) {
    this.scene = scene;
    try {
      this.ctx = new AudioContext();
    } catch {
      this.ctx = null;
    }
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'square', vol = this.volume) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch { /* ignore audio errors */ }
  }

  playShoot() { this.beep(800, 0.05, 'square', 0.1); }
  playHit() { this.beep(200, 0.1, 'sawtooth', 0.2); }
  playDeath() { this.beep(100, 0.4, 'sawtooth', 0.3); }
  playExplosion() { this.beep(60, 0.3, 'sawtooth', 0.25); }
  playPowerUp() { this.beep(1200, 0.15, 'sine', 0.2); }
  playBossPhase() { this.beep(400, 0.5, 'triangle', 0.3); }
  playBomb() { this.beep(50, 0.6, 'sawtooth', 0.4); }

  // TODO: music stubs — replace with actual tracks later
  // playStageMusic(stage: number) {}
  // playBossMusic() {}
  // stopMusic() {}

  setMuted(m: boolean) { this.muted = m; }
  setVolume(v: number) { this.volume = v; }
}
