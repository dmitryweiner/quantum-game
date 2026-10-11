import { describe, expect, it } from 'vitest';
import { moveWithCollisions } from '../src/game/systems/movement';

// A 3×3 room: walls on the border, floor in the middle cell (1,1).
const room = (col: number, row: number) => !(col === 1 && row === 1);

describe('moveWithCollisions', () => {
  it('moves freely inside open space', () => {
    expect(moveWithCollisions({ x: 1.5, y: 1.5 }, { x: 0.1, y: -0.1 }, 0.3, room)).toEqual({
      x: 1.6,
      y: 1.4,
    });
  });

  it('blocks movement into a wall', () => {
    const p = moveWithCollisions({ x: 1.5, y: 1.5 }, { x: 0.3, y: 0 }, 0.3, room);
    expect(p).toEqual({ x: 1.5, y: 1.5 });
  });

  it('slides along a wall when moving diagonally', () => {
    const open = (col: number, row: number) => row < 0 || col < 0 || col > 5;
    // Wall row at y<0; moving up-right should keep x motion and drop y motion.
    const p = moveWithCollisions({ x: 2.5, y: 0.35 }, { x: 0.2, y: -0.2 }, 0.3, open);
    expect(p.x).toBeCloseTo(2.7);
    expect(p.y).toBeCloseTo(0.35);
  });

  it('allows touching a wall exactly', () => {
    const p = moveWithCollisions({ x: 1.5, y: 1.5 }, { x: 0.2, y: 0 }, 0.3, room);
    expect(p.x).toBeCloseTo(1.7);
  });
});
