import { describe, expect, it } from 'vitest';
import { floodLattice } from '../src/quantum/lattice';
import { mulberry32 } from '../src/quantum/rng';
import { Superposition } from '../src/quantum/superposition';

/** 1D corridor of n cells along row 0. */
const corridor = (n: number) =>
  floodLattice({ col: 0, row: 0 }, (c, r) => r === 0 && c >= 0 && c < n);

const sum = (a: ArrayLike<number>) => Array.from(a).reduce((s, x) => s + x, 0);
const none = (n: number) => new Array<boolean>(n).fill(false);

describe('floodLattice', () => {
  it('collects only reachable open cells with 4-neighbours', () => {
    // Two rooms separated by a wall column at c=2.
    const open = (c: number, r: number) => c >= 0 && c < 5 && r >= 0 && r < 2 && c !== 2;
    const lat = floodLattice({ col: 0, row: 0 }, open);
    expect(lat.size).toBe(4);
    expect(lat.siteAt(3, 0)).toBe(-1);
    const s = lat.siteAt(0, 0);
    expect(lat.nbrStart[s + 1]! - lat.nbrStart[s]!).toBe(2);
  });
});

describe('Superposition evolution', () => {
  it('starts definite and spreads when unobserved', () => {
    const psi = new Superposition(corridor(9), 4, 1);
    expect(psi.definiteSite()).toBe(4);
    psi.evolve(1);
    expect(psi.definiteSite()).toBe(-1);
    expect(sum(psi.probabilities())).toBeCloseTo(1, 9);
  });

  it('keeps the norm over a long evolution', () => {
    const psi = new Superposition(corridor(12), 0, 1.5);
    for (let i = 0; i < 600; i++) psi.evolve(1 / 60);
    expect(sum(psi.probabilities())).toBeCloseTo(1, 9);
  });

  it('spreads symmetrically from the middle', () => {
    const psi = new Superposition(corridor(11), 5, 1);
    psi.evolve(1.3);
    const p = psi.probabilities();
    for (let k = 1; k <= 5; k++) expect(p[5 - k]).toBeCloseTo(p[5 + k]!, 9);
  });

  it('spreads ballistically: the front moves at a constant speed', () => {
    // On an infinite line the front sits at ~2γt; check the mean distance grows ~linearly.
    const lat = corridor(81);
    const mean = (t: number) => {
      const psi = new Superposition(lat, 40, 1);
      psi.evolve(t);
      const p = psi.probabilities();
      let d = 0;
      for (let i = 0; i < p.length; i++) d += p[i]! * Math.abs(i - 40);
      return d;
    };
    const ratio = mean(10) / mean(5);
    expect(ratio).toBeGreaterThan(1.9); // diffusion would give √2 ≈ 1.41
    expect(ratio).toBeLessThan(2.1);
  });

  it('matches the exact Bessel solution on an infinite line', () => {
    // ψ_n(t) = iⁿ·J_n(2γt); at γt=1, P(0) = J0(2)² ≈ 0.0499
    const psi = new Superposition(corridor(41), 20, 1);
    psi.evolve(1);
    expect(psi.probability(20)).toBeCloseTo(0.2238907791 ** 2, 5);
  });
});

describe('Superposition measurement', () => {
  it('follows the Born rule for the found site', () => {
    const lat = corridor(5);
    const base = new Superposition(lat, 2, 1);
    base.evolve(0.7);
    const expected = base.probabilities();
    const counts = new Array<number>(5).fill(0);
    const rng = mulberry32(99);
    const all = new Array<boolean>(5).fill(true);
    const n = 20_000;
    for (let k = 0; k < n; k++) {
      const psi = new Superposition(lat, 2, 1);
      psi.evolve(0.7);
      const out = psi.measure(all, rng);
      if (out.kind !== 'found') throw new Error('looking everywhere must find it');
      counts[out.site]!++;
      expect(psi.definiteSite()).toBe(out.site);
    }
    // σ ≈ 0.0032 per bin; allow ~4σ.
    for (let i = 0; i < 5; i++) expect(Math.abs(counts[i]! / n - expected[i]!)).toBeLessThan(0.013);
  });

  it('a negative result removes the seen part and renormalizes the rest', () => {
    const lat = corridor(5);
    const psi = new Superposition(lat, 2, 1);
    psi.evolve(0.7);
    const before = psi.probabilities();
    const seen = none(5);
    seen[0] = seen[1] = true;
    // Find a seed giving "absent".
    let out;
    for (let seed = 0; ; seed++) {
      const copy = new Superposition(lat, 2, 1);
      copy.evolve(0.7);
      out = copy.measure(seen, mulberry32(seed));
      if (out.kind === 'absent') {
        const p = copy.probabilities();
        const rest = before[2]! + before[3]! + before[4]!;
        expect(p[0]).toBe(0);
        expect(p[1]).toBe(0);
        for (const i of [2, 3, 4]) expect(p[i]).toBeCloseTo(before[i]! / rest, 9);
        break;
      }
    }
    expect(psi.definiteSite()).toBe(-1);
  });

  it('watching a region all the time keeps the object out (Zeno)', () => {
    const lat = corridor(10);
    const seen = none(10);
    for (let i = 6; i < 10; i++) seen[i] = true;
    const rng = mulberry32(1);
    let found = 0;
    const runs = 200;
    for (let r = 0; r < runs; r++) {
      const psi = new Superposition(lat, 0, 1.5);
      for (let f = 0; f < 600; f++) {
        psi.evolve(1 / 60);
        if (psi.measure(seen, rng).kind === 'found') {
          found++;
          break;
        }
      }
    }
    // Unwatched, the cat would be in cells 6..9 a third of the time or more.
    expect(found / runs).toBeLessThan(0.25);
  });
});
