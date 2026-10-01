const MUSIC_START = 4;
const defaults = { music: 40, sfx: 85 };
export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('rapture-settings') || '{}');
    // Migrate the old synth mix once; future adjustments to the real loop persist.
    if (saved.musicVersion !== 2) saved.music = 40;
    return Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, Number.isFinite(saved[k]) ? Math.max(0, Math.min(100, saved[k])) : v]));
  } catch { return { ...defaults }; }
}
export class AudioDirector {
  constructor() { this.settings = loadSettings(); this.wantsPlayback = false; this.revision = 0; this.disposed = false; }
  acquireMusic() {
    if (this.ownsMusic || !globalThis.navigator?.locks) return Promise.resolve(true);
    if (this.lockPending) return this.lockPending;
    this.lockPending = new Promise(resolve => {
      navigator.locks.request('rapture-invaders-music', { ifAvailable: true }, async lock => {
        if (!lock || !this.wantsPlayback || this.disposed) { resolve(false); return; }
        this.ownsMusic = true;
        await new Promise(release => { this.releaseMusic = release; resolve(true); });
      }).catch(() => resolve(false));
    }).finally(() => { this.lockPending = null; });
    return this.lockPending;
  }
  releaseOwnership() {
    this.releaseMusic?.(); this.releaseMusic = null; this.ownsMusic = false;
  }
  start() {
    if (this.disposed || document.hidden) return Promise.resolve(false);
    this.wantsPlayback = true;
    if (!this.context) {
      this.context = new AudioContext();
      this.music = this.context.createGain(); this.music.connect(this.context.destination);
      this.loop = new Audio('/assets/audio/music.mp3'); this.loop.preload = 'auto';
      this.loop.currentTime = MUSIC_START;
      this.onMetadata = () => { if (this.loop.currentTime < MUSIC_START) this.loop.currentTime = MUSIC_START; };
      this.onEnded = () => {
        this.loop.currentTime = MUSIC_START;
        if (this.wantsPlayback && !this.disposed && !document.hidden) this.start();
      };
      this.loop.addEventListener('loadedmetadata', this.onMetadata, { once: true });
      this.loop.addEventListener('ended', this.onEnded);
      this.source = this.context.createMediaElementSource(this.loop); this.source.connect(this.music);
      this.set('music', this.settings.music);
    }
    // Resume inside the user gesture even when an earlier autoplay attempt is pending.
    const resumed = this.context.resume().catch(() => {});
    if (this.starting) return this.starting;
    const revision = this.revision;
    const pending = (async () => {
      if (!await this.acquireMusic()) return false;
      await resumed;
      if (!this.wantsPlayback || this.disposed || revision !== this.revision || document.hidden) return false;
      if (this.loop.paused) await this.loop.play();
      return true;
    })().catch(() => { this.releaseOwnership(); return false; });
    this.starting = pending;
    pending.finally(() => { if (this.starting === pending) this.starting = null; });
    return pending;
  }
  set(key, value) {
    this.settings[key] = value;
    if (this.music) this.music.gain.setTargetAtTime(this.settings.music / 100, this.context.currentTime, .1);
    try { localStorage.setItem('rapture-settings', JSON.stringify({ ...this.settings, musicVersion: 2 })); } catch { /* Storage may be disabled. */ }
  }
  tone(kind) {
    if (!this.context || this.context.state !== 'running' || this.disposed || !this.settings.sfx) return;
    if (kind === 'armorHit') { this.armorTing(); return; }
    const t = this.context.currentTime, voice = this.context.createOscillator(), gain = this.context.createGain();
    const sounds = { shoot: [720, 160, .08], hit: [180, 45, .15], impact: [260, 85, .065], armor: [880, 240, .12], dive: [180, 420, .22], pickup: [400, 1200, .28], boom: [90, 22, .35], click: [330, 520, .06] };
    const [from, to, duration] = sounds[kind] || sounds.click;
    voice.type = kind === 'boom' ? 'sawtooth' : 'triangle'; voice.frequency.setValueAtTime(from, t); voice.frequency.exponentialRampToValueAtTime(to, t + duration);
    gain.gain.setValueAtTime(.12 * this.settings.sfx / 100, t); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    voice.connect(gain).connect(this.context.destination); voice.start(t); voice.stop(t + duration);
    voice.onended = () => { voice.disconnect(); gain.disconnect(); };
  }
  armorTing() {
    const context = this.context, t = context.currentTime;
    // Inharmonic overtones and a sharp attack read as a small metal impact.
    for (const [frequency, level, decay] of [[1950, .085, .19], [3180, .045, .12], [4870, .023, .075]]) {
      const voice = context.createOscillator(), gain = context.createGain();
      voice.type = 'sine'; voice.frequency.setValueAtTime(frequency, t);
      voice.frequency.exponentialRampToValueAtTime(frequency * .97, t + decay);
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.linearRampToValueAtTime(level * this.settings.sfx / 100, t + .002);
      gain.gain.exponentialRampToValueAtTime(.0001, t + decay);
      voice.connect(gain).connect(context.destination); voice.start(t); voice.stop(t + decay + .01);
      voice.onended = () => { voice.disconnect(); gain.disconnect(); };
    }
  }
  suspend() {
    this.wantsPlayback = false; this.revision++; this.starting = null;
    this.loop?.pause(); this.context?.suspend().catch(() => {}); this.releaseOwnership();
  }
  dispose() {
    if (this.disposed) return;
    this.suspend(); this.disposed = true;
    this.loop?.removeEventListener('loadedmetadata', this.onMetadata);
    this.loop?.removeEventListener('ended', this.onEnded);
    this.source?.disconnect(); this.music?.disconnect();
    this.context?.close().catch(() => {});
    if (this.loop) { this.loop.removeAttribute('src'); this.loop.load(); }
  }
}
