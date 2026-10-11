import type { Vec2 } from './movement';

/** Field of view in cell units. */
export interface Cone {
  origin: Vec2;
  /** Direction, radians (0 = +x, y grows downwards). */
  angle: number;
  range: number;
  halfAngle: number;
}

/** True if this cell stops light (walls do, glass does not). */
export type SightBlocker = (col: number, row: number) => boolean;

const STEP = 0.05;

/** Marches from `a` to `b` and reports whether any blocking cell is crossed. */
export function lineOfSight(a: Vec2, b: Vec2, blocks: SightBlocker): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const steps = Math.ceil(len / STEP);
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    if (blocks(Math.floor(a.x + dx * t), Math.floor(a.y + dy * t))) return false;
  }
  return true;
}

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

/** A cell is seen when its centre is inside the cone and not hidden behind a wall. */
export function cellSeen(cone: Cone, col: number, row: number, blocks: SightBlocker): boolean {
  const c = { x: col + 0.5, y: row + 0.5 };
  const dx = c.x - cone.origin.x;
  const dy = c.y - cone.origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > cone.range) return false;
  // The observer always sees what is right under their nose.
  if (dist > 0.5 && angleDiff(Math.atan2(dy, dx), cone.angle) > cone.halfAngle) return false;
  return lineOfSight(cone.origin, c, blocks);
}

/** Distance a ray travels before hitting a blocking cell (≤ maxDist). */
export function castRay(
  origin: Vec2,
  angle: number,
  maxDist: number,
  blocks: SightBlocker,
): number {
  const cx = Math.cos(angle);
  const cy = Math.sin(angle);
  for (let d = STEP; d < maxDist; d += STEP) {
    if (blocks(Math.floor(origin.x + cx * d), Math.floor(origin.y + cy * d))) return d;
  }
  return maxDist;
}

/**
 * How well a cell is seen, from 0 to 1, with soft edges `soft` cells wide —
 * a blurry look has no sharp border. Walls still block it completely.
 */
export function cellVisibility(
  cone: Cone,
  col: number,
  row: number,
  blocks: SightBlocker,
  soft: number,
): number {
  const c = { x: col + 0.5, y: row + 0.5 };
  const dx = c.x - cone.origin.x;
  const dy = c.y - cone.origin.y;
  const dist = Math.hypot(dx, dy);
  const outOfRange = Math.max(0, dist - cone.range);
  const outOfAngle =
    dist > 0.5 ? Math.max(0, angleDiff(Math.atan2(dy, dx), cone.angle) - cone.halfAngle) * dist : 0;
  const excess = Math.hypot(outOfRange, outOfAngle);
  if (excess > 3 * soft) return 0;
  if (!lineOfSight(cone.origin, c, blocks)) return 0;
  return Math.exp(-((excess / soft) ** 2));
}
