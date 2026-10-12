import Phaser from 'phaser';
import { levelById } from '../../levels';
import { ARCADE_SCENES } from '../menu';

/** Nothing to load yet: emoji come from the system font. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // ?level=ch2-03 opens a level directly (handy for sharing and for previews).
    const id = new URLSearchParams(location.search).get('level');
    const arcade = id ? ARCADE_SCENES[id] : undefined;
    if (arcade) this.scene.start(arcade);
    else if (id && (levelById(id) || id === 'sandbox')) this.scene.start('Level', { levelId: id });
    else this.scene.start('Level', { showMenu: true });
  }
}
