import { describe, expect, it } from 'vitest';
import {
  doubleSlitRows,
  machZehnder,
  zenoBombTest,
  zenoSurvival,
} from '../src/quantum/interference';
import { mulberry32 } from '../src/quantum/rng';

describe('double slit', () => {
  const opts = { rows: 15, centre: 7, spacing: 6, envelope: 5 };

  it('has stripes with both slits and none when the path is known', () => {
    const both = doubleSlitRows({ ...opts, whichPath: false });
    const known = doubleSlitRows({ ...opts, whichPath: true });
    expect(both.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    // Bright centre, dark three rows away (first minimum).
    expect(both[7]!).toBeGreaterThan(0.15);
    expect(both[10]!).toBeLessThan(0.01);
    // Knowing the path fills the dark stripe in.
    expect(known[10]!).toBeGreaterThan(0.05);
    expect(known[10]! / both[10]!).toBeGreaterThan(10);
  });

  it('is symmetric about the centre', () => {
    const both = doubleSlitRows({ ...opts, whichPath: false });
    for (let k = 1; k <= 7; k++) expect(both[7 - k]).toBeCloseTo(both[7 + k]!, 12);
  });
});

describe('Mach–Zehnder bomb tester', () => {
  const freq = (bomb: boolean) => {
    const rng = mulberry32(4);
    const c = { boom: 0, bright: 0, dark: 0 };
    const n = 40_000;
    for (let i = 0; i < n; i++) c[machZehnder(bomb, rng)]++;
    return { boom: c.boom / n, bright: c.bright / n, dark: c.dark / n };
  };

  it('without a bomb the dark detector never fires', () => {
    expect(freq(false)).toEqual({ boom: 0, bright: 1, dark: 0 });
  });

  it('with a bomb: ½ boom, ¼ bright, ¼ dark', () => {
    const f = freq(true);
    expect(f.boom).toBeCloseTo(0.5, 1);
    expect(f.bright).toBeCloseTo(0.25, 1);
    expect(f.dark).toBeCloseTo(0.25, 1);
  });
});

describe('Zeno bomb tester', () => {
  it('always says empty for an empty box', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 200; i++) expect(zenoBombTest(false, 10, rng)).toBe('empty');
  });

  it('finds a live bomb safely with probability cos^(2n)(π/2n)', () => {
    const rng = mulberry32(6);
    for (const n of [2, 10, 25]) {
      let safe = 0;
      const runs = 20_000;
      for (let i = 0; i < runs; i++) if (zenoBombTest(true, n, rng) === 'bomb') safe++;
      expect(Math.abs(safe / runs - zenoSurvival(n))).toBeLessThan(0.015);
    }
    expect(zenoSurvival(25)).toBeGreaterThan(0.9);
  });
});
