import type Phaser from 'phaser';
import { CELL, COLORS, GAZE } from '../constants';
import type { Vec2 } from './movement';

/**
 * Draws the observer's field of view. In M0 it is purely visual; from M1
 * the GazeSystem will use the same cone (with wall occlusion) to decide
 * which quantum objects are being measured.
 */
export class GazeCone {
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.gfx = scene.add.graphics();
    layer.add(this.gfx);
  }

  /** `from` and `target` are in world units; `target` null hides the cone. */
  draw(from: Vec2, target: Vec2 | null): void {
    const g = this.gfx;
    g.clear();
    if (!target) return;
    const angle = Math.atan2(target.y - from.y, target.x - from.x);
    const r = GAZE.range * CELL;
    g.fillStyle(COLORS.gaze, 0.16);
    g.slice(from.x, from.y, r, angle - GAZE.halfAngle, angle + GAZE.halfAngle, false);
    g.fillPath();
    g.lineStyle(2, COLORS.gaze, 0.35);
    g.strokePath();
  }
}
