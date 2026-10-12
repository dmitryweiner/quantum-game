import type Phaser from 'phaser';
import { ui } from './ui';

/** Ids of the arcade games and the scenes that play them. */
export const ARCADE_SCENES: Readonly<Record<string, string>> = {
  'arcade:snake': 'Snake',
  'arcade:tanks': 'Tanks',
};

/**
 * Opens the main menu over the current scene; picking an entry stops this
 * scene and starts the level or arcade game.
 */
export function openMainMenu(scene: Phaser.Scene): void {
  ui().showMenu((id) => {
    const arcade = ARCADE_SCENES[id];
    if (arcade) scene.scene.start(arcade);
    else scene.scene.start('Level', { levelId: id });
  });
}
