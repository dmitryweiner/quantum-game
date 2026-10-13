import type { EffectId } from '../strings/effects';

/**
 * The "shock kit" shared by arcades and the sandbox (PLAN-IMPROVEMENTS.md §1):
 * moments that cannot happen classically, caught and named as they happen.
 */
export type ParadoxKind =
  /** Found far from where it would be classically (S1). `value`: cells. */
  | 'far'
  /** A measurement picked an unlikely outcome. `value`: its chance, 0…1. */
  | 'rare'
  /** Looked, saw nothing — and that moved the object. `value`: the chance it had to be there. */
  | 'negative'
  /** Held still by being watched. `value`: seconds. */
  | 'zeno'
  /** Passed through a wall it cannot cross. */
  | 'tunnel'
  /** One collapse set another object far away. `value`: cells. */
  | 'spooky';

export interface Paradox {
  kind: ParadoxKind;
  value: number;
}

export const PARADOX_EFFECT: Readonly<Record<ParadoxKind, EffectId>> = {
  far: 'collapse',
  rare: 'born-rule',
  negative: 'negative-result',
  zeno: 'zeno',
  tunnel: 'tunnelling',
  spooky: 'entanglement',
};

/** Thresholds: what is surprising enough to be named. */
export const SHOCK = {
  /** Found at least this many cells from the classical place. */
  farCells: 3,
  /** An outcome with at most this chance is "rare". */
  rareChance: 0.35,
  /** A miss is worth naming if the object had at least this chance to be there. */
  negativeChance: 0.25,
  /** Watched still for this long. */
  zenoSeconds: 2.5,
  /** At most one caption per this many seconds. */
  toastGap: 2,
  /** Spread (cells) per +1 of the score multiplier, and the cap (S8). */
  spreadPerPoint: 1.5,
  maxMultiplier: 3,
} as const;

/** Counts paradoxes and decides which ones get a caption (not more often than SHOCK.toastGap). */
export class ParadoxLog {
  readonly counts = new Map<ParadoxKind, number>();
  total = 0;
  private lastToast = -Infinity;

  /** Records a paradox at time `now` (s); true if it should be captioned now. */
  add(p: Paradox, now: number): boolean {
    this.counts.set(p.kind, (this.counts.get(p.kind) ?? 0) + 1);
    this.total++;
    if (now - this.lastToast < SHOCK.toastGap) return false;
    this.lastToast = now;
    return true;
  }

  /** Per effect, most frequent first — for the game-over screen. */
  breakdown(): { effect: EffectId; kind: ParadoxKind; count: number }[] {
    return [...this.counts]
      .map(([kind, count]) => ({ kind, effect: PARADOX_EFFECT[kind], count }))
      .sort((a, b) => b.count - a.count);
  }
}

/**
 * Where an object would be classically (S1): its last seen place, carried on
 * by its last known velocity (an apple stays put, an invader marches).
 */
export class ClassicalTwin {
  constructor(
    public x: number,
    public y: number,
    public vx = 0,
    public vy = 0,
  ) {}

  /** Seen at (x, y): the classical guess starts again from there. */
  seen(x: number, y: number, vx = this.vx, vy = this.vy): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  step(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  distanceTo(x: number, y: number): number {
    return Math.hypot(x - this.x, y - this.y);
  }

  /** A `far` paradox if (x, y) is surprisingly far from the classical place. */
  farFrom(x: number, y: number): Paradox | null {
    const d = Math.round(this.distanceTo(x, y));
    return d >= SHOCK.farCells ? { kind: 'far', value: d } : null;
  }
}

/**
 * Score multiplier for catching an object that was spread over `spread`
 * cells (S8): a frozen one is worth ×1, a wide cloud up to ×3. Being
 * quantum pays; staring (Zeno) is safe but cheap.
 */
export function spreadMultiplier(spread: number): number {
  return Math.min(SHOCK.maxMultiplier, 1 + Math.floor(spread / SHOCK.spreadPerPoint));
}
