import type { Vec2 } from '../systems/movement';

/**
 * Where the observer looks:
 * - `point`: a screen point (mouse) — the gaze turns towards it;
 * - `angle`: a direction (gaze stick, Shift+arrows), radians, 0 = right, y down.
 */
export type Gaze = { kind: 'point'; x: number; y: number } | { kind: 'angle'; angle: number };

export interface ControlState {
  /** Desired movement direction, length ≤ 1. */
  move: Vec2;
  /** Where the observer looks, or null when the eyes are closed. */
  gaze: Gaze | null;
}
