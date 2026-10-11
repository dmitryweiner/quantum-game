/**
 * Seedable pseudo-random number generator (mulberry32).
 *
 * Every random decision in the quantum model goes through an `Rng`, so a
 * level replayed with the same seed collapses in exactly the same way and
 * tests are deterministic.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Uniform integer in [0, n). */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng.next() * n);
}

/**
 * Picks an index with probability proportional to its weight (Born rule
 * sampling when weights are |amplitude|²). Weights need not be normalized.
 */
export function pickWeighted(rng: Rng, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += w;
  if (!(total > 0)) throw new Error('pickWeighted: weights must have a positive sum');
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i] ?? 0;
    if (r < 0) return i;
  }
  // Floating point leftovers: return the last index with non-zero weight.
  for (let i = weights.length - 1; i >= 0; i--) if ((weights[i] ?? 0) > 0) return i;
  return weights.length - 1;
}
