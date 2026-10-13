import { describe, expect, it } from 'vitest';
import { ClassicalTwin, ParadoxLog, SHOCK, spreadMultiplier } from '../src/arcade/paradox';

describe('shock kit', () => {
  it('captions at most one paradox per gap but counts them all', () => {
    const log = new ParadoxLog();
    expect(log.add({ kind: 'far', value: 5 }, 0)).toBe(true);
    expect(log.add({ kind: 'rare', value: 0.2 }, 0.5)).toBe(false);
    expect(log.add({ kind: 'far', value: 4 }, SHOCK.toastGap + 0.1)).toBe(true);
    expect(log.total).toBe(3);
    expect(log.breakdown()[0]).toMatchObject({ kind: 'far', effect: 'collapse', count: 2 });
  });

  it('the classical twin carries on by inertia and names far finds', () => {
    const t = new ClassicalTwin(2, 2, 1, 0);
    t.step(2);
    expect(t.x).toBe(4);
    expect(t.farFrom(5, 2)).toBeNull();
    expect(t.farFrom(4, 8)).toEqual({ kind: 'far', value: 6 });
  });

  it('a wider cloud is worth more, up to the cap', () => {
    expect(spreadMultiplier(0)).toBe(1);
    expect(spreadMultiplier(2)).toBe(2);
    expect(spreadMultiplier(50)).toBe(SHOCK.maxMultiplier);
  });
});
