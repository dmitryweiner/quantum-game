import type Phaser from 'phaser';
import type { Basis } from '../../levels/map';
import { CELL } from '../constants';
import { emojiTexture } from '../emoji';
import type { Core, Flower, Lamp } from '../systems/LevelSim';
import { lampLook } from '../systems/looks';

/** A lamp qubit: lit 💡, dark, 🌓/🌗 through X glasses, or flickering while undecided. */
export class LampView {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly lamp: Lamp,
  ) {
    this.sprite = scene.add.image(
      (lamp.def.col + 0.5) * CELL,
      (lamp.def.row + 0.5) * CELL,
      emojiTexture(scene, '💡'),
    );
    this.sprite.setDisplaySize(CELL * 0.8, CELL * 0.8);
    layer.add(this.sprite);
  }

  render(glasses: Basis, time: number): void {
    const look = lampLook(this.lamp, glasses);
    const emoji = look === 'plus' ? '🌓' : look === 'minus' ? '🌗' : '💡';
    this.sprite.setTexture(emojiTexture(this.scene, emoji));
    this.sprite.setDisplaySize(CELL * 0.8, CELL * 0.8);
    if (look === 'off') this.sprite.setTint(0x333344).setAlpha(1);
    else if (look === null) {
      // Undecided between on and off: it flickers.
      this.sprite.clearTint().setAlpha(0.45 + 0.4 * Math.abs(Math.sin(time * 0.012)));
    } else this.sprite.clearTint().setAlpha(1);
  }
}

/** A flower that blooms by itself: 🌱 and 🌸 overlaid with the chances of each. */
export class FlowerView {
  private readonly bud: Phaser.GameObjects.Image;
  private readonly bloom: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly flower: Flower,
  ) {
    const x = (flower.def.col + 0.5) * CELL;
    const y = (flower.def.row + 0.5) * CELL;
    this.bud = scene.add
      .image(x, y, emojiTexture(scene, '🌱'))
      .setDisplaySize(CELL * 0.8, CELL * 0.8);
    this.bloom = scene.add
      .image(x, y, emojiTexture(scene, '🌸'))
      .setDisplaySize(CELL * 0.8, CELL * 0.8);
    layer.add([this.bud, this.bloom]);
  }

  render(): void {
    const p = this.flower.r.p1;
    this.bud.setAlpha(Math.max(0, 1 - p) ** 0.7);
    this.bloom.setAlpha(p ** 0.7);
  }
}

/** An unstable core: ☢️, with a 💥 ghost as strong as its chance of having decayed. */
export class CoreView {
  private readonly core: Phaser.GameObjects.Image;
  private readonly boom: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly state: Core,
  ) {
    const x = (state.def.col + 0.5) * CELL;
    const y = (state.def.row + 0.5) * CELL;
    this.core = scene.add
      .image(x, y, emojiTexture(scene, '☢️'))
      .setDisplaySize(CELL * 0.8, CELL * 0.8);
    this.boom = scene.add
      .image(x, y, emojiTexture(scene, '💥'))
      .setDisplaySize(CELL * 0.9, CELL * 0.9);
    layer.add([this.core, this.boom]);
  }

  render(): void {
    const p = this.state.decayed ? 1 : this.state.r.p1;
    this.core.setAlpha(Math.max(0, 1 - p) ** 0.7);
    this.boom.setAlpha(p ** 0.7);
  }
}
