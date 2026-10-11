import { describe, expect, it } from 'vitest';
import { mulberry32, pickWeighted, randInt } from '../src/quantum/rng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('differs between seeds', () => {
    expect(mulberry32(1).next()).not.toBe(mulberry32(2).next());
  });

  it('stays in [0, 1) and is roughly uniform', () => {
    const rng = mulberry32(7);
    const buckets = new Array<number>(10).fill(0);
    const n = 100_000;
    for (let i = 0; i < n; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      buckets[Math.floor(v * 10)]!++;
    }
    for (const count of buckets) expect(Math.abs(count / n - 0.1)).toBeLessThan(0.01);
  });
});

describe('randInt', () => {
  it('covers exactly [0, n)', () => {
    const rng = mulberry32(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(randInt(rng, 6));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('pickWeighted', () => {
  it('follows the weights (Born rule sampling)', () => {
    const rng = mulberry32(11);
    const counts = [0, 0, 0];
    const n = 60_000;
    for (let i = 0; i < n; i++) counts[pickWeighted(rng, [0.5, 0.25, 0.25])]!++;
    expect(counts[0]! / n).toBeCloseTo(0.5, 1);
    expect(counts[1]! / n).toBeCloseTo(0.25, 1);
    expect(counts[2]! / n).toBeCloseTo(0.25, 1);
  });

  it('never picks a zero-weight branch', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 1000; i++) expect(pickWeighted(rng, [0, 1, 0])).toBe(1);
  });

  it('rejects all-zero weights', () => {
    expect(() => pickWeighted(mulberry32(1), [0, 0])).toThrow();
  });
});
