/**
 * Sound effects synthesised with WebAudio: no sample files, so nothing to
 * license (PLAN.md §0: CC0 only). Mobile browsers start audio only after a
 * user gesture, so the context is created/resumed on the first touch or key.
 */
const KEY = 'quantum-game:sound';

export type SoundName =
  'collapse' | 'flash' | 'click' | 'tick' | 'hit' | 'lamp' | 'boom' | 'snap' | 'win' | 'lose';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = readEnabled();
/** Last time each sound played, to keep bursts (many photons a second) pleasant. */
const lastPlayed = new Map<SoundName, number>();
const MIN_GAP: Partial<Record<SoundName, number>> = {
  collapse: 0.08,
  flash: 0.08,
  hit: 0.05,
  tick: 0.04,
};

function readEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Not remembered; still applies now.
  }
  if (on) unlock();
}

/** Creates or resumes the audio context; call from a user gesture. */
export function unlock(): void {
  if (!enabled) return;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.25;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Arms `unlock` on the first gesture (mobile autoplay rules). */
export function installAudioUnlock(): void {
  const once = () => unlock();
  window.addEventListener('pointerdown', once, { passive: true });
  window.addEventListener('keydown', once);
}

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; to?: number; gain?: number; delay?: number } = {},
): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.5, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, opts: { from?: number; to?: number; gain?: number } = {}): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(opts.from ?? 2000, t0);
  filter.frequency.exponentialRampToValueAtTime(opts.to ?? 200, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.8, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

export function play(name: SoundName): void {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const gap = MIN_GAP[name] ?? 0;
  if (now - (lastPlayed.get(name) ?? -1) < gap) return;
  lastPlayed.set(name, now);
  switch (name) {
    case 'collapse':
      tone(880, 0.12, { to: 440, type: 'triangle', gain: 0.35 });
      break;
    case 'flash':
      tone(660, 0.1, { to: 990, type: 'sine', gain: 0.3 });
      break;
    case 'click':
      tone(1500, 0.03, { type: 'square', gain: 0.08 });
      break;
    case 'tick':
      noise(0.03, { from: 6000, to: 3000, gain: 0.25 });
      break;
    case 'hit':
      tone(1200, 0.05, { type: 'sine', gain: 0.15 });
      break;
    case 'lamp':
      tone(1320, 0.4, { type: 'sine', gain: 0.4 });
      tone(1980, 0.3, { type: 'sine', gain: 0.2, delay: 0.05 });
      break;
    case 'boom':
      noise(0.7, { from: 1200, to: 60, gain: 1 });
      tone(90, 0.5, { to: 40, type: 'sine', gain: 0.6 });
      break;
    case 'snap':
      tone(1400, 0.05, { type: 'triangle', gain: 0.25 });
      tone(700, 0.08, { type: 'triangle', gain: 0.2, delay: 0.05 });
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(f, 0.25, { type: 'triangle', gain: 0.35, delay: i * 0.09 }),
      );
      break;
    case 'lose':
      tone(392, 0.45, { to: 196, type: 'sawtooth', gain: 0.15 });
      break;
  }
}
