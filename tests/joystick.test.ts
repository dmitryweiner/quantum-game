import { describe, expect, it } from 'vitest';
import { clampToRadius, joystickVector } from '../src/game/input/joystick';

describe('joystickVector', () => {
  it('is zero inside the dead zone', () => {
    expect(joystickVector(3, 4, 60, 10)).toEqual({ x: 0, y: 0 });
  });

  it('saturates at full strength beyond the radius', () => {
    const v = joystickVector(0, -200, 60, 10);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(-1);
  });

  it('ramps linearly between dead zone and radius', () => {
    const v = joystickVector(35, 0, 60, 10);
    expect(v.x).toBeCloseTo(0.5);
  });
});

describe('clampToRadius', () => {
  it('keeps points inside, projects points outside', () => {
    expect(clampToRadius(3, 4, 10)).toEqual({ x: 3, y: 4 });
    const p = clampToRadius(30, 40, 10);
    expect(p.x).toBeCloseTo(6);
    expect(p.y).toBeCloseTo(8);
  });
});
