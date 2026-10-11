import { X_ANGLE, Z_ANGLE, type Outcome } from './entangled';
import { Qubit } from './qubit';
import type { Rng } from './rng';

export type Basis = 'Z' | 'X';
const ANGLE: Readonly<Record<Basis, number>> = { Z: Z_ANGLE, X: X_ANGLE };

export interface Bb84Photon {
  aliceBasis: Basis;
  aliceBit: Outcome;
  bobBasis: Basis;
  bobBit: Outcome;
}

const coin = (rng: Rng) => rng.next() < 0.5;

/**
 * BB84 key distribution over one channel. Alice sends `n` photons, each a
 * random bit in a random basis; a spy, if present, measures every photon in
 * a random basis and sends on what she saw; Bob measures in a random basis.
 * Where Alice's and Bob's bases match, the bits must agree — unless a spy
 * looked: then about a quarter of them disagree. Looking always leaves marks.
 */
export function sendPhotons(n: number, spy: boolean, rng: Rng): Bb84Photon[] {
  return Array.from({ length: n }, () => {
    const aliceBasis: Basis = coin(rng) ? 'Z' : 'X';
    const aliceBit: Outcome = coin(rng) ? 1 : 0;
    const q = new Qubit(ANGLE[aliceBasis] + (aliceBit ? Math.PI / 2 : 0));
    if (spy) q.measure(ANGLE[coin(rng) ? 'Z' : 'X'], rng);
    const bobBasis: Basis = coin(rng) ? 'Z' : 'X';
    const bobBit = q.measure(ANGLE[bobBasis], rng);
    return { aliceBasis, aliceBit, bobBasis, bobBit };
  });
}

/** Photons where the bases matched: the raw key. */
export const sift = (photons: readonly Bb84Photon[]): Bb84Photon[] =>
  photons.filter((p) => p.aliceBasis === p.bobBasis);

/** Compare the first `k` sifted bits in public: how many disagree. */
export function compareSample(
  sifted: readonly Bb84Photon[],
  k: number,
): { checked: number; errors: number } {
  const sample = sifted.slice(0, k);
  return { checked: sample.length, errors: sample.filter((p) => p.aliceBit !== p.bobBit).length };
}
