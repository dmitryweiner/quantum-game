import Phaser from 'phaser';
import type { MapObject } from '../../levels/map';
import { X_ANGLE, type EntangledPair } from '../../quantum/entangled';
import { CELL, COLORS } from '../constants';
import { emojiTexture } from '../emoji';

/** Ball colours: Z glasses show red/blue, X glasses green/orange. */
const COLOURS = { Z: ['🔴', '🔵'], X: ['🟢', '🟠'] } as const;

/** The ball's emoji for what is known about it, or ⚪ while it has no colour. */
export function qubitEmoji(pair: EntangledPair, side: 0 | 1): string {
  const s = pair.local[side];
  if (!s) return '⚪';
  return COLOURS[Math.abs(s.angle - X_ANGLE) < 1e-9 ? 'X' : 'Z'][s.outcome];
}

/** One ball of an entangled pair. */
export class Qubit {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly x: number;
  private readonly y: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    readonly def: MapObject,
  ) {
    this.x = (def.col + 0.5) * CELL;
    this.y = (def.row + 0.5) * CELL;
    this.sprite = scene.add.image(this.x, this.y, emojiTexture(scene, '⚪'));
    this.sprite.setDisplaySize(CELL * 0.7, CELL * 0.7);
    layer.add(this.sprite);
  }

  get position(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  render(pair: EntangledPair, time: number): void {
    const side = this.def.side ?? 0;
    const emoji = qubitEmoji(pair, side);
    this.sprite.setTexture(emojiTexture(this.scene, emoji));
    // A colourless ball shimmers: it is not secretly red or blue.
    const pulse = emoji === '⚪' ? 0.06 * Math.sin(time * 0.006 + side * Math.PI) : 0;
    this.sprite.setDisplaySize(CELL * (0.7 + pulse), CELL * (0.7 + pulse));
    this.sprite.setAlpha(emoji === '⚪' ? 0.75 + pulse * 3 : 1);
  }

  flash(): void {
    const ring = this.scene.add
      .circle(this.x, this.y, CELL * 0.3)
      .setStrokeStyle(4, COLORS.collapse, 1);
    this.layer.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: 2.6,
      alpha: 0,
      duration: 450,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => ring.destroy(),
    });
  }
}

/** Dashed thread between the two balls while they are entangled; it snaps on measurement. */
export class EntanglementThread {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private brokenAt: number | null = null;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly a: { x: number; y: number },
    private readonly b: { x: number; y: number },
  ) {
    this.gfx = scene.add.graphics();
    layer.add(this.gfx);
  }

  render(pair: EntangledPair, time: number): void {
    const g = this.gfx;
    g.clear();
    if (!pair.entangled && this.brokenAt === null) this.brokenAt = time;
    const fade = this.brokenAt === null ? 1 : 1 - (time - this.brokenAt) / 500;
    if (fade <= 0) return;

    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const len = Math.hypot(dx, dy);
    const dash = 10;
    // Dashes crawl along the thread while it is intact.
    const offset = this.brokenAt === null ? (time * 0.03) % (dash * 2) : 0;
    g.lineStyle(4, COLORS.thread, 0.75 * fade);
    for (let d = offset - dash * 2; d < len; d += dash * 2) {
      const s = Math.max(0, d);
      const e = Math.min(len, d + dash);
      if (e <= s) continue;
      // A snapping thread sags apart in the middle.
      const gap = this.brokenAt === null ? 0 : (1 - fade) * len * 0.5;
      if (Math.abs((s + e) / 2 - len / 2) < gap) continue;
      g.lineBetween(
        this.a.x + (dx * s) / len,
        this.a.y + (dy * s) / len,
        this.a.x + (dx * e) / len,
        this.a.y + (dy * e) / len,
      );
    }
  }
}
