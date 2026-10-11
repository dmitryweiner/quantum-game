import { describe, expect, it } from 'vitest';
import { compareSample, sendPhotons, sift } from '../src/quantum/bb84';
import { mulberry32 } from '../src/quantum/rng';
import { Teleporter } from '../src/quantum/teleport';
import {
  bellMeasure,
  check,
  compare,
  decide,
  maxCompare,
  newSpyGame,
  newTeleportGame,
  nextChannel,
  nextRound,
  peek,
  receive,
  toggleFlip,
} from '../src/game/systems/qinfo';

const ANGLES = [0, Math.PI / 2, Math.PI / 4, (3 * Math.PI) / 4];

describe('teleportation', () => {
  it('with the right flips the far qubit is exactly the secret', () => {
    const rng = mulberry32(1);
    for (let t = 0; t < 200; t++) {
      const angle = ANGLES[t % 4]! + (t % 7) * 0.1;
      const tp = new Teleporter(angle);
      const [zBit, xBit] = tp.bellMeasure(rng);
      if (xBit) tp.flipFar('X');
      if (zBit) tp.flipFar('Z');
      expect(tp.farMatches(angle)).toBeCloseTo(1, 9);
    }
  });

  it('without the flips it is right only when the bits happen to be 00', () => {
    const rng = mulberry32(2);
    let ok = 0;
    const n = 4000;
    for (let t = 0; t < n; t++) {
      const angle = ANGLES[t % 4]!;
      const tp = new Teleporter(angle);
      tp.bellMeasure(rng);
      if (rng.next() < tp.farMatches(angle)) ok++;
    }
    // Wrong flips scramble it: on average it matches half the time.
    expect(ok / n).toBeCloseTo(0.5, 1);
  });

  it('each Bell outcome is equally likely, whatever the secret', () => {
    const rng = mulberry32(3);
    const counts = [0, 0, 0, 0];
    for (let t = 0; t < 8000; t++) {
      const [a, b] = new Teleporter(ANGLES[t % 4]!).bellMeasure(rng);
      counts[a * 2 + b]!++;
    }
    for (const c of counts) expect(c / 8000).toBeCloseTo(0.25, 1);
  });
});

describe('BB84', () => {
  const errorRate = (spy: boolean) => {
    const rng = mulberry32(spy ? 5 : 6);
    const s = sift(sendPhotons(20_000, spy, rng));
    const { checked, errors } = compareSample(s, s.length);
    return { sifted: s.length, rate: errors / checked };
  };

  it('a clean line has no errors; about half the photons survive sifting', () => {
    const r = errorRate(false);
    expect(r.rate).toBe(0);
    expect(r.sifted / 20_000).toBeCloseTo(0.5, 1);
  });

  it('a spy who looks leaves about 25% errors', () => {
    expect(errorRate(true).rate).toBeCloseTo(0.25, 1);
  });
});

describe('teleport game', () => {
  const play = (quantum: boolean, seed: number) => {
    const rng = mulberry32(seed);
    const g = newTeleportGame(5, rng);
    for (let r = 0; r < 5; r++) {
      if (quantum) {
        bellMeasure(g, rng);
        if (g.bits![1]) toggleFlip(g, 'X');
        if (g.bits![0]) toggleFlip(g, 'Z');
      } else peek(g, rng);
      if (!check(g, rng)) return false;
      nextRound(g, rng);
    }
    return g.streak === 5;
  };

  it('teleporting wins every round', () => {
    for (let s = 0; s < 50; s++) expect(play(true, s)).toBe(true);
  });

  it('looking and telling wins 5 in a row only rarely (3/4 per round)', () => {
    let wins = 0;
    for (let s = 0; s < 2000; s++) if (play(false, s)) wins++;
    expect(Math.abs(wins / 2000 - 0.75 ** 5)).toBeLessThan(0.04);
  });
});

describe('spy game', () => {
  const play = (k: number | 'none', seed: number) => {
    const rng = mulberry32(seed);
    const g = newSpyGame(3, rng);
    while (!g.lost && g.correct < 3) {
      receive(g, rng);
      if (k === 'none') decide(g, rng.next() < 0.5 ? 'clean' : 'spy');
      else {
        compare(g, Math.min(k, maxCompare(g)));
        decide(g, g.current.compared!.errors > 0 ? 'spy' : 'clean');
      }
      nextChannel(g, rng);
    }
    return !g.lost;
  };

  it('checking enough bits catches the spy almost always', () => {
    let wins = 0;
    for (let s = 0; s < 1000; s++) if (play(10, s)) wins++;
    expect(wins / 1000).toBeGreaterThan(0.8);
  });

  it('guessing without checking rarely gets three in a row', () => {
    let wins = 0;
    for (let s = 0; s < 1000; s++) if (play('none', s)) wins++;
    expect(wins / 1000).toBeLessThan(0.2);
  });
});
