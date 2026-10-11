import type Phaser from 'phaser';
import { CELL, COLORS } from '../constants';
import { castRay, type Cone, type SightBlocker } from './sight';

const RAYS = 48;

/** Draws the observer's field of view, cut off by walls (glass lets it through). */
export class GazeCone {
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.gfx = scene.add.graphics();
    layer.add(this.gfx);
  }

  draw(cone: Cone | null, blocks: SightBlocker, colour: number = COLORS.gaze): void {
    const g = this.gfx;
    g.clear();
    if (!cone) return;
    const { origin } = cone;
    g.fillStyle(colour, 0.16);
    g.lineStyle(2, colour, 0.35);
    g.beginPath();
    g.moveTo(origin.x * CELL, origin.y * CELL);
    for (let i = 0; i <= RAYS; i++) {
      const a = cone.angle - cone.halfAngle + (2 * cone.halfAngle * i) / RAYS;
      const d = castRay(origin, a, cone.range, blocks);
      g.lineTo((origin.x + Math.cos(a) * d) * CELL, (origin.y + Math.sin(a) * d) * CELL);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  }
}
