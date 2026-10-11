import type { Rng } from './rng';

/** Two particles meet at a 50/50 beam splitter, one from each side. */
export type ParticleKind = 'bosons' | 'fermions' | 'marbles';
export type PairResult = 'together-left' | 'together-right' | 'apart';

/**
 * Hong–Ou–Mandel. The two ways for the pair to leave through different
 * doors (both reflected, or both transmitted) have amplitudes of opposite
 * sign. For identical bosons the amplitudes add, so those two cancel: they
 * always leave together. For identical fermions the exchange sign flips the
 * sum: only "apart" survives. Distinguishable marbles do not interfere at
 * all: half the time apart, half together.
 */
export function beamSplitterPair(kind: ParticleKind, rng: Rng): PairResult {
  const side = (): PairResult => (rng.next() < 0.5 ? 'together-left' : 'together-right');
  if (kind === 'bosons') return side();
  if (kind === 'fermions') return 'apart';
  return rng.next() < 0.5 ? 'apart' : side();
}
