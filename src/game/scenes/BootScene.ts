import Phaser from 'phaser';
import { levelById } from '../../levels';

/** Nothing to load yet: emoji come from the system font. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // ?level=ch2-03 opens a level directly (handy for sharing and for previews).
    const id = new URLSearchParams(location.search).get('level');
    if (id && (levelById(id) || id === 'sandbox')) this.scene.start('Level', { levelId: id });
    else this.scene.start('Level', { showMenu: true });
  }
}
