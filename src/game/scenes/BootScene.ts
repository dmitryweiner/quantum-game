import Phaser from 'phaser';
import { idFromHash, startById } from '../menu';

/** Nothing to load yet: emoji come from the system font. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // #snake, #ships, #quantris, #sandbox or #ch1-02 open a game directly;
    // ?level=… does the same (used by the dev preview).
    const id =
      idFromHash(location.hash) ??
      idFromHash(new URLSearchParams(location.search).get('level') ?? '');
    if (id) startById(this, id);
    else this.scene.start('Level', { showMenu: true });
  }
}
