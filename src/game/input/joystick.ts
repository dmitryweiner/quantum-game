import type { Vec2 } from '../systems/movement';

/**
 * Converts a thumb offset from the joystick centre into a movement vector of
 * length ≤ 1. Offsets inside the dead zone give zero; beyond it the output
 * ramps up linearly and saturates at `radius`.
 */
export function joystickVector(dx: number, dy: number, radius: number, deadZone: number): Vec2 {
  const len = Math.hypot(dx, dy);
  if (len <= deadZone || radius <= deadZone) return { x: 0, y: 0 };
  const strength = Math.min(1, (len - deadZone) / (radius - deadZone));
  return { x: (dx / len) * strength, y: (dy / len) * strength };
}

/** Clamps the knob position so it never leaves the joystick base. */
export function clampToRadius(dx: number, dy: number, radius: number): Vec2 {
  const len = Math.hypot(dx, dy);
  if (len <= radius) return { x: dx, y: dy };
  return { x: (dx / len) * radius, y: (dy / len) * radius };
}
