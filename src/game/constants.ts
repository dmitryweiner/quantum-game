/** World units per grid cell. */
export const CELL = 64;

/** Resolution of cached emoji textures (px per side). */
export const EMOJI_TEXTURE_SIZE = 128;

export const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

export const UI_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const COLORS = {
  background: 0x0b0e1a,
  floor: 0x161c33,
  floorLine: 0x222a47,
  gaze: 0xfff2a8,
  glass: 0x7fd4ff,
  ghostHeat: 0xb48cff,
  collapse: 0xffffff,
  target: 0xffcf7a,
  joystickBase: 0xffffff,
  joystickKnob: 0x7fd4ff,
} as const;

export const PLAYER = {
  /** Cells per second at full stick. */
  speed: 3.2,
  /** Collision radius in cells. */
  radius: 0.32,
} as const;

export const GAZE = {
  /** Cone length in cells. */
  range: 4.5,
  /** Half of the cone opening angle, radians. */
  halfAngle: Math.PI / 6,
} as const;
