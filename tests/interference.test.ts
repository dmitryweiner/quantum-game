import { describe, expect, it } from 'vitest';
import { doubleSlitRows } from '../src/quantum/interference';

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
