import { describe, expect, it } from 'vitest';
import { X_ANGLE, Z_ANGLE } from '../src/quantum/entangled';
import { Qubit, RabiSystem } from '../src/quantum/qubit';
import { mulberry32 } from '../src/quantum/rng';

describe('Qubit', () => {
  it('|+⟩ is a coin in Z but certain in X', () => {
    const q = new Qubit(X_ANGLE);
    expect(q.definiteAt(X_ANGLE)).toBe(0);
    expect(q.definiteAt(Z_ANGLE)).toBeNull();
    expect(q.probabilityAlong(Z_ANGLE)).toBeCloseTo(0.5, 12);
  });

  it('a Z look erases the X answer', () => {
    const rng = mulberry32(1);
    let zeros = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      const q = new Qubit(X_ANGLE);
      q.measure(Z_ANGLE, rng);
      if (q.measure(X_ANGLE, rng) === 0) zeros++;
    }
    expect(zeros / n).toBeCloseTo(0.5, 1);
  });
});

describe('RabiSystem', () => {
  it('unobserved, swings to |1⟩ after a quarter period', () => {
    const r = new RabiSystem(Math.PI / 8);
    r.evolve(4);
    expect(r.p1).toBeCloseTo(1, 9);
    r.evolve(4);
    expect(r.p1).toBeCloseTo(0, 9);
  });

  it('watched every frame, it almost never flips (Zeno)', () => {
    const rng = mulberry32(2);
    let flipped = 0;
    for (let run = 0; run < 200; run++) {
      const r = new RabiSystem(Math.PI / 8);
      for (let f = 0; f < 240; f++) {
        r.evolve(1 / 60);
        if (r.measure(rng) === 1) {
          flipped++;
          break;
        }
      }
    }
    // Unwatched it would surely flip within these 4 s.
    expect(flipped / 200).toBeLessThan(0.1);
  });
});
