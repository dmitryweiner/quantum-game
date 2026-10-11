import { floodLattice } from './lattice';
import { Superposition } from './superposition';

/**
 * Where a quantum "ball" lands on a board of `slots` cells after spreading
 * from the middle for `time` seconds (continuous-time quantum walk, γ = 1).
 * Unlike a classical random walk — a bell curve around the middle — the
 * wave runs out to both sides and is most likely found near the edges of
 * its spread.
 */
export function quantumBoard(slots: number, time: number): number[] {
  const lattice = floodLattice({ col: 0, row: 0 }, (x, y) => y === 0 && x >= 0 && x < slots);
  const psi = new Superposition(lattice, Math.floor(slots / 2), 1);
  psi.evolve(time);
  return Array.from({ length: slots }, (_, x) => psi.probability(lattice.siteAt(x, 0)));
}

/** The classical random walk with the same hopping: a Gaussian of variance 2t around the middle. */
export function classicalBoard(slots: number, time: number): number[] {
  const mid = Math.floor(slots / 2);
  const p = Array.from({ length: slots }, (_, x) => Math.exp(-((x - mid) ** 2) / (4 * time)));
  const total = p.reduce((a, b) => a + b, 0);
  return p.map((v) => v / total);
}
