import type Phaser from 'phaser';
import { CELL, PLAYER } from '../constants';
import { emojiTexture } from '../emoji';
import { moveWithCollisions, type Vec2, type WallTest } from '../systems/movement';

/** The observer 👁️. Position is kept in cells; the sprite follows it. */
export class Player {
  pos: Vec2;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly openKey: string;
  private readonly closedKey: string;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, start: Vec2) {
    this.pos = { ...start };
    this.openKey = emojiTexture(scene, '👁️');
    this.closedKey = emojiTexture(scene, '😑');
    this.sprite = scene.add.image(0, 0, this.openKey).setDisplaySize(CELL * 0.9, CELL * 0.9);
    layer.add(this.sprite);
    this.sync();
  }

  /** World-space centre of the observer. */
  get world(): Vec2 {
    return { x: this.pos.x * CELL, y: this.pos.y * CELL };
  }

  update(dtSeconds: number, move: Vec2, isWall: WallTest): void {
    // Sub-steps keep each step well below one cell even on a long frame.
    const steps = Math.max(1, Math.ceil(PLAYER.speed * dtSeconds * 4));
    const d = (PLAYER.speed * dtSeconds) / steps;
    for (let i = 0; i < steps; i++) {
      this.pos = moveWithCollisions(
        this.pos,
        { x: move.x * d, y: move.y * d },
        PLAYER.radius,
        isWall,
      );
    }
    this.sync();
  }

  setEyesOpen(open: boolean): void {
    this.sprite.setTexture(open ? this.openKey : this.closedKey);
  }

  private sync(): void {
    this.sprite.setPosition(this.pos.x * CELL, this.pos.y * CELL);
  }
}
