import { describe, expect, it } from 'vitest';
import { cellSeen, cellVisibility, type Cone } from '../src/game/systems/sight';

const open = () => false;

describe('cellSeen', () => {
  // Looking straight right from the middle of cell (0, 0), a narrow 10° cone.
  const cone: Cone = {
    origin: { x: 0.5, y: 0.5 },
    angle: 0,
    range: 6,
    halfAngle: (10 * Math.PI) / 180,
  };

  it('sees cells whose centre is in the cone', () => {
    expect(cellSeen(cone, 4, 0, open)).toBe(true);
  });

  it('counts a cell the cone only touches at its edge', () => {
    // At x≈5 the cone reaches y≈0.5 ± 0.8: cell (5, 1)'s centre (y=1.5) is outside,
    // but its upper part is inside the cone.
    expect(cellSeen(cone, 5, 1, open)).toBe(true);
  });

  it('ignores cells the cone does not reach at all', () => {
    expect(cellSeen(cone, 2, 2, open)).toBe(false);
    expect(cellSeen(cone, 8, 0, open)).toBe(false);
  });

  it('still respects walls', () => {
    const wall = (c: number, r: number) => c === 3 && r === 0;
    expect(cellSeen(cone, 5, 0, wall)).toBe(false);
  });

  it('a blurry look sees a touched cell fully too', () => {
    expect(cellVisibility(cone, 5, 1, open, 1.5)).toBe(1);
  });
});
