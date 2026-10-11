import { describe, expect, it } from 'vitest';
import {
  EntangledPair,
  OPTIMAL_CHSH,
  X_ANGLE,
  Z_ANGLE,
  chshWins,
  playChshRound,
  type Card,
  type ChshStrategy,
  type Move,
} from '../src/quantum/entangled';
import { mulberry32 } from '../src/quantum/rng';

const agreeRate = (angleA: number, angleB: number, n = 20_000) => {
  const rng = mulberry32(7);
  let same = 0;
  for (let i = 0; i < n; i++) {
    const pair = new EntangledPair();
    if (pair.measure(0, angleA, rng) === pair.measure(1, angleB, rng)) same++;
  }
  return same / n;
};

describe('EntangledPair', () => {
  it('each side alone is a fair coin', () => {
    const pair = new EntangledPair();
    expect(pair.probabilityAlong(0, Z_ANGLE)).toBeCloseTo(0.5, 12);
    expect(pair.probabilityAlong(1, X_ANGLE)).toBeCloseTo(0.5, 12);
    expect(pair.probabilityAlong(1, 1.234)).toBeCloseTo(0.5, 12);
  });

  it('agrees with probability cos²(θA − θB)', () => {
    for (const [a, b] of [
      [0, 0],
      [0, Math.PI / 8],
      [Math.PI / 4, -Math.PI / 8],
      [0, Math.PI / 2],
      [0.3, 1.1],
    ] as const) {
      expect(Math.abs(agreeRate(a, b) - Math.cos(a - b) ** 2)).toBeLessThan(0.015);
    }
  });

  it('collapses the partner to the same direction and outcome', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const pair = new EntangledPair();
      const a = pair.measure(0, X_ANGLE, rng);
      expect(pair.entangled).toBe(false);
      expect(pair.local[1]).toEqual({ angle: X_ANGLE, outcome: a });
      expect(pair.probabilityAlong(1, X_ANGLE)).toBeCloseTo(a === 0 ? 1 : 0, 12);
    }
  });

  it('measuring Z first destroys the X correlation (non-commuting measurements)', () => {
    const rng = mulberry32(5);
    let same = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) {
      const pair = new EntangledPair();
      pair.measure(0, Z_ANGLE, rng);
      if (pair.measure(0, X_ANGLE, rng) === pair.measure(1, X_ANGLE, rng)) same++;
    }
    expect(same / n).toBeCloseTo(0.5, 1);
  });

  it('repeating the same measurement gives the same answer', () => {
    const rng = mulberry32(9);
    const pair = new EntangledPair();
    const first = pair.measure(0, Z_ANGLE, rng);
    for (let i = 0; i < 20; i++) expect(pair.measure(0, Z_ANGLE, rng)).toBe(first);
  });
});

describe('CHSH game', () => {
  const winRate = (s: ChshStrategy, n = 40_000) => {
    const rng = mulberry32(11);
    let wins = 0;
    for (let i = 0; i < n; i++) if (playChshRound(s, rng).win) wins++;
    return wins / n;
  };

  it('scores rounds by the CHSH rule', () => {
    expect(chshWins(0, 0, 1, 1)).toBe(true);
    expect(chshWins(0, 1, 0, 1)).toBe(false);
    expect(chshWins(1, 1, 0, 1)).toBe(true);
    expect(chshWins(1, 1, 1, 1)).toBe(false);
  });

  it('the quantum strategy wins cos²(π/8) ≈ 85.4%', () => {
    expect(Math.abs(winRate(OPTIMAL_CHSH) - Math.cos(Math.PI / 8) ** 2)).toBeLessThan(0.01);
  });

  it('no strategy available to the player beats 85.4% and classical ones stay ≤ 75%', () => {
    const moves: Move[] = ['red', 'blue', 'look-z', 'look-x'];
    for (const robot of ['quantum', 'always-red'] as const) {
      for (const m0 of moves) {
        for (const m1 of moves) {
          const rate = winRate({ player: { 0: m0, 1: m1 }, robot }, 8000);
          expect(rate).toBeLessThan(0.87);
          const classical =
            robot === 'always-red' || (!m0.startsWith('look') && !m1.startsWith('look'));
          if (classical) expect(rate, `${robot} ${m0} ${m1}`).toBeLessThan(0.77);
        }
      }
    }
  });

  it('400 rounds separate quantum from classical at the 80% threshold', () => {
    const passRate = (s: ChshStrategy, trials = 300) => {
      const rng = mulberry32(21);
      let pass = 0;
      for (let t = 0; t < trials; t++) {
        let wins = 0;
        for (let i = 0; i < 400; i++) if (playChshRound(s, rng).win) wins++;
        if (wins >= 320) pass++;
      }
      return pass / trials;
    };
    expect(passRate(OPTIMAL_CHSH)).toBeGreaterThan(0.98);
    const bestClassical: ChshStrategy = { player: { 0: 'red', 1: 'red' }, robot: 'always-red' };
    expect(passRate(bestClassical)).toBeLessThan(0.03);
  });

  it('uses fixed cards when given', () => {
    const r = playChshRound(OPTIMAL_CHSH, mulberry32(1), [1 as Card, 0 as Card]);
    expect([r.x, r.y]).toEqual([1, 0]);
  });
});
