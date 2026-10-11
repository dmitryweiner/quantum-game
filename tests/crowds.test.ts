import { describe, expect, it } from 'vitest';
import {
  chooseKind,
  dropRound,
  moveBucket,
  newPairGame,
  newPlinkoGame,
  sendPair,
} from '../src/game/systems/crowds';
import { mulberry32 } from '../src/quantum/rng';
import { beamSplitterPair } from '../src/quantum/statistics';
import { classicalBoard, quantumBoard } from '../src/quantum/walk';

describe('quantum walk board', () => {
  it('peaks near the edges of its spread, unlike the classical bell curve', () => {
    const q = quantumBoard(21, 3.5);
    const c = classicalBoard(21, 3.5);
    expect(q.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    const peak = q.indexOf(Math.max(...q));
    expect(Math.abs(peak - 10)).toBeGreaterThan(4);
    expect(c.indexOf(Math.max(...c))).toBe(10);
  });

  const winRate = (bucket: number) => {
    const rng = mulberry32(bucket + 100);
    let wins = 0;
    for (let t = 0; t < 1000; t++) {
      const g = newPlinkoGame();
      moveBucket(g, bucket);
      dropRound(g, rng);
      if (g.won) wins++;
    }
    return wins / 1000;
  };

  it('a bucket at the peak wins a round much more often than one in the middle', () => {
    const q = quantumBoard(21, 3.5);
    let best = 0;
    for (let i = 0; i < 20; i++) if (q[i]! + q[i + 1]! > q[best]! + q[best + 1]!) best = i;
    expect(winRate(best)).toBeGreaterThan(0.55);
    expect(winRate(9)).toBeLessThan(0.12);
  });
});

describe('Hong–Ou–Mandel', () => {
  const rates = (kind: 'bosons' | 'fermions' | 'marbles') => {
    const rng = mulberry32(7);
    let apart = 0;
    for (let i = 0; i < 4000; i++) if (beamSplitterPair(kind, rng) === 'apart') apart++;
    return apart / 4000;
  };

  it('bosons never part, fermions always do, marbles half the time', () => {
    expect(rates('bosons')).toBe(0);
    expect(rates('fermions')).toBe(1);
    expect(rates('marbles')).toBeCloseTo(0.5, 1);
  });

  const playPairs = (
    together: 'bosons' | 'marbles',
    apart: 'fermions' | 'marbles',
    seed: number,
  ) => {
    const rng = mulberry32(seed);
    const g = newPairGame();
    chooseKind(g, together);
    while (g.task === 'together' && !g.lost) sendPair(g, rng);
    if (g.lost) return false;
    chooseKind(g, apart);
    while (g.done.length < 2 && !g.lost) sendPair(g, rng);
    return !g.lost;
  };

  it('the right particles finish both tasks; marbles almost never do', () => {
    for (let s = 0; s < 20; s++) expect(playPairs('bosons', 'fermions', s)).toBe(true);
    let wins = 0;
    for (let s = 0; s < 2000; s++) if (playPairs('marbles', 'marbles', s)) wins++;
    expect(wins / 2000).toBeLessThan(0.01);
  });
});
