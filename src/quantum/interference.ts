import { Qubit } from './qubit';
import { pickWeighted, type Rng } from './rng';

/**
 * Two-slit pattern on a screen of `rows` cells (PLAN.md §4.1, «Интерференция»).
 *
 * Far-field amplitudes from the two slits share a broad envelope E(y); their
 * phase difference grows linearly across the screen, one full turn per
 * `spacing` rows. With both paths open the intensity is E·cos²(π·y/spacing)
 * — bright and dark stripes. If anything learnt which slit the particle took,
 * the two amplitudes no longer add: the intensity is just E, no stripes.
 *
 * Returns the probability of each row, integrated over the row (the dark
 * fringes are not exactly zero once smeared over a whole cell).
 */
export function doubleSlitRows(opts: {
  rows: number;
  /** Row (can be fractional) in line with the middle between the slits. */
  centre: number;
  /** Rows from one bright stripe to the next. */
  spacing: number;
  /** Width of the envelope, rows. */
  envelope: number;
  whichPath: boolean;
}): number[] {
  const { rows, centre, spacing, envelope, whichPath } = opts;
  const SUB = 40;
  const p = Array.from({ length: rows }, (_, r) => {
    let sum = 0;
    for (let k = 0; k < SUB; k++) {
      const y = r + (k + 0.5) / SUB - 0.5 - centre;
      const e = Math.exp(-(y * y) / (2 * envelope * envelope));
      sum += whichPath ? e : 2 * e * Math.cos((Math.PI * y) / spacing) ** 2;
    }
    return sum / SUB;
  });
  const total = p.reduce((a, b) => a + b, 0);
  return p.map((v) => v / total);
}

/** Where one particle lands on the screen (row index), by the Born rule. */
export function sampleScreenRow(rows: readonly number[], rng: Rng): number {
  return pickWeighted(rng, rows);
}

export type MachZehnderResult = 'boom' | 'bright' | 'dark';

/**
 * One photon through a Mach–Zehnder interferometer with 50/50 beam splitters.
 * The paths are a qubit: |0⟩ = lower arm, |1⟩ = upper arm (where the box is).
 * Without a bomb the two arms interfere so the photon always reaches the
 * bright detector. A live bomb in the upper arm measures the path: half the
 * time the photon is there and it explodes; otherwise the interference is
 * gone and the photon reaches either detector — the dark one proves the bomb
 * is there although the photon never touched it (Elitzur–Vaidman).
 */
export function machZehnder(bomb: boolean, rng: Rng): MachZehnderResult {
  const q = new Qubit(0);
  q.angle += Math.PI / 4; // first beam splitter
  if (bomb && q.measure(0, rng) === 1) return 'boom'; // the bomb looks at the upper arm
  q.angle += Math.PI / 4; // second beam splitter
  return q.measure(0, rng) === 1 ? 'bright' : 'dark';
}

export type ZenoBombResult = 'boom' | 'bomb' | 'empty';

/**
 * Zeno-boosted bomb test (Kwiat et al. 1995): the photon goes round `n`
 * times, each pass turning its path by π/2n towards the box arm. With no
 * bomb the turns add up and it always ends in the box arm ('empty'). A live
 * bomb looks at the arm on every pass; each look most likely finds the photon
 * still in the safe arm and resets it, so it ends there ('bomb') with
 * probability cos^(2n)(π/2n) → 1 as n grows.
 */
export function zenoBombTest(bomb: boolean, n: number, rng: Rng): ZenoBombResult {
  const q = new Qubit(0);
  const step = Math.PI / (2 * n);
  for (let i = 0; i < n; i++) {
    q.angle += step;
    if (bomb && q.measure(0, rng) === 1) return 'boom';
  }
  return q.measure(0, rng) === 1 ? 'empty' : 'bomb';
}

/** Chance that a Zeno test of a live bomb with `n` passes ends safely. */
export const zenoSurvival = (n: number): number => Math.cos(Math.PI / (2 * n)) ** (2 * n);
