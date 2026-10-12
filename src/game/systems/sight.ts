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
  const ac = Math.floor(a.x);
  const ar = Math.floor(a.y);
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const c = Math.floor(a.x + dx * t);
    const r = Math.floor(a.y + dy * t);
    // The viewer's own cell never blocks (a camera sits in a wall).
    if ((c !== ac || r !== ar) && blocks(c, r)) return false;
  }
  return true;
}

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

/**
 * Points that stand for a cell: its centre, corners and edge midpoints,
 * pulled slightly inside so a ray to a corner does not graze the next cell.
 * Centre first: it is the most likely to be seen, so checks stop early.
 */
const SAMPLE_OFFSETS: readonly (readonly [number, number])[] = (() => {
  const k = [0.08, 0.5, 0.92];
  const pts: [number, number][] = [[0.5, 0.5]];
  for (const x of k) for (const y of k) if (x !== 0.5 || y !== 0.5) pts.push([x, y]);
  return pts;
})();

/** How far outside the cone a point is: 0 inside, else cells beyond its edge. */
function excessOf(cone: Cone, p: Vec2): number {
  const dx = p.x - cone.origin.x;
  const dy = p.y - cone.origin.y;
  const dist = Math.hypot(dx, dy);
  const outOfRange = Math.max(0, dist - cone.range);
  // The observer always sees what is right under their nose.
  const outOfAngle =
    dist > 0.5 ? Math.max(0, angleDiff(Math.atan2(dy, dx), cone.angle) - cone.halfAngle) * dist : 0;
  return Math.hypot(outOfRange, outOfAngle);
}

/**
 * A cell is seen when any part of it — not just its centre — is inside the
 * cone and not hidden behind a wall: a look that touches a cell counts.
 */
export function cellSeen(cone: Cone, col: number, row: number, blocks: SightBlocker): boolean {
  for (const [ox, oy] of SAMPLE_OFFSETS) {
    const p = { x: col + ox, y: row + oy };
    if (excessOf(cone, p) === 0 && lineOfSight(cone.origin, p, blocks)) return true;
  }
  return false;
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
  const oc = Math.floor(origin.x);
  const or = Math.floor(origin.y);
  for (let d = STEP; d < maxDist; d += STEP) {
    const c = Math.floor(origin.x + cx * d);
    const r = Math.floor(origin.y + cy * d);
    // The viewer's own cell never blocks (a camera sits in a wall).
    if ((c !== oc || r !== or) && blocks(c, r)) return d;
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
  // The best-seen point of the cell decides, as for a sharp look.
  let best = 0;
  for (const [ox, oy] of SAMPLE_OFFSETS) {
    const p = { x: col + ox, y: row + oy };
    const excess = excessOf(cone, p);
    if (excess > 3 * soft) continue;
    const v = Math.exp(-((excess / soft) ** 2));
    if (v <= best || !lineOfSight(cone.origin, p, blocks)) continue;
    best = v;
    if (best === 1) break;
  }
  return best;
}
