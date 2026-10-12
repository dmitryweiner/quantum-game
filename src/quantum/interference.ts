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
