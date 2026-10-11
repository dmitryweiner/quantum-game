import Phaser from 'phaser';

/** Nothing to load yet: emoji come from the system font. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Play');
  }
}
