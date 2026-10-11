import { describe, expect, it } from 'vitest';
import {
  allSorted,
  bombsLeft,
  newBombGame,
  openBox,
  provenBombs,
  testBox,
  zenoTestBox,
  type BombGame,
} from '../src/game/systems/bombs';
import { mulberry32, type Rng } from '../src/quantum/rng';

const unknownBox = (g: BombGame) => g.state.findIndex((s) => s === 'unknown');

/**
 * Test the least-tested unknown box with single photons until one is proven
 * or no live bombs are left (an empty box answers 'bright' forever, so a
 * sensible player moves on).
 */
function proveOne(rng: Rng): boolean {
  const g = newBombGame(5, 3, rng);
  const tries = new Array<number>(5).fill(0);
  for (let step = 0; step < 500 && provenBombs(g) === 0 && bombsLeft(g) > 0; step++) {
    let box = -1;
    for (let i = 0; i < 5; i++) {
      if (g.state[i] === 'unknown' && (box < 0 || tries[i]! < tries[box]!)) box = i;
    }
    tries[box]!++;
    testBox(g, box, rng);
  }
  return provenBombs(g) > 0;
}

describe('bomb game', () => {
  it('opening boxes never proves a bomb safely (the classical way)', () => {
    const rng = mulberry32(1);
    for (let t = 0; t < 50; t++) {
      const g = newBombGame(5, 3, rng);
      for (let i = 0; i < 5; i++) openBox(g, i);
      expect(provenBombs(g)).toBe(0);
      expect(g.explosions).toBe(3);
    }
  });

  it('single-photon tests prove a bomb most of the time', () => {
    const rng = mulberry32(2);
    let wins = 0;
    for (let t = 0; t < 2000; t++) if (proveOne(rng)) wins++;
    // Each live bomb: proven before exploding with chance 1/3, so 1 - (2/3)^3 ≈ 0.70.
    expect(Math.abs(wins / 2000 - (1 - (2 / 3) ** 3))).toBeLessThan(0.03);
  });

  const sortAll = (passes: number, rng: Rng) => {
    const g = newBombGame(5, 3, rng);
    while (!allSorted(g)) zenoTestBox(g, unknownBox(g), passes, rng);
    return g.explosions <= 1;
  };

  it('Zeno tests with many passes sort all boxes with at most one explosion', () => {
    const rng = mulberry32(3);
    let wins = 0;
    for (let t = 0; t < 1000; t++) if (sortAll(25, rng)) wins++;
    expect(wins / 1000).toBeGreaterThan(0.95);
  });

  it('with a single pass every live bomb goes off', () => {
    const rng = mulberry32(4);
    for (let t = 0; t < 100; t++) expect(sortAll(1, rng)).toBe(false);
  });
});
