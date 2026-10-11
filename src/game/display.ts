/**
 * HiDPI handling. Phaser has no global "resolution" setting, so the canvas
 * is created at device-pixel size and shown at CSS size via `scale.zoom`.
 * DPR is capped at 2 to keep fill-rate sane on mid-range phones.
 */
export const DPR = Math.min(window.devicePixelRatio || 1, 2);

export function viewportSize(): { width: number; height: number } {
  return {
    width: Math.round(window.innerWidth * DPR),
    height: Math.round(window.innerHeight * DPR),
  };
}

/** CSS pixels → canvas pixels, for UI sizes such as the 44 px tap target. */
export const px = (cssPx: number): number => cssPx * DPR;
