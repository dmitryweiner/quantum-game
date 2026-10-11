import type { Vec2 } from '../systems/movement';

export interface ControlState {
  /** Desired movement direction, length ≤ 1. */
  move: Vec2;
  /** Screen point the observer looks at, or null when the eyes are closed. */
  gaze: Vec2 | null;
}
