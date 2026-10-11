import type Phaser from 'phaser';
import { CELL } from '../constants';
import { emojiTexture } from '../emoji';
import type { Vec2 } from '../systems/movement';

/** The observer 👁️ — a view of the position kept by LevelSim. */
export class Player {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly openKey: string;
  private readonly closedKey: string;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.openKey = emojiTexture(scene, '👁️');
    this.closedKey = emojiTexture(scene, '😑');
    this.sprite = scene.add.image(0, 0, this.openKey).setDisplaySize(CELL * 0.9, CELL * 0.9);
    layer.add(this.sprite);
  }

  render(pos: Vec2, eyesOpen: boolean): void {
    this.sprite.setPosition(pos.x * CELL, pos.y * CELL);
    this.sprite.setTexture(eyesOpen ? this.openKey : this.closedKey);
  }
}
