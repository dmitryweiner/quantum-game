/**
 * Grid collision for a round body moving through walls. Positions and the
 * radius are measured in cells (1 cell = 1 unit), so the code is engine-free
 * and testable.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type WallTest = (col: number, row: number) => boolean;

function overlapsWall(x: number, y: number, r: number, isWall: WallTest): boolean {
  const minCol = Math.floor(x - r);
  const maxCol = Math.floor(x + r - 1e-9);
  const minRow = Math.floor(y - r);
  const maxRow = Math.floor(y + r - 1e-9);
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (isWall(col, row)) return true;
    }
  }
  return false;
}

/**
 * Moves `pos` by `delta`, resolving each axis separately so the body slides
 * along walls instead of sticking to them. Movement per call should stay
 * below one cell to avoid tunnelling through thin walls (the classical kind).
 */
export function moveWithCollisions(pos: Vec2, delta: Vec2, radius: number, isWall: WallTest): Vec2 {
  let { x, y } = pos;
  if (delta.x !== 0 && !overlapsWall(x + delta.x, y, radius, isWall)) x += delta.x;
  if (delta.y !== 0 && !overlapsWall(x, y + delta.y, radius, isWall)) y += delta.y;
  return { x, y };
}
