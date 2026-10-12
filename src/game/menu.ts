import type Phaser from 'phaser';
import { ARCADE_SCENES, HASH_OF } from './routes';
import { ui } from './ui';

export { ARCADE_SCENES, idFromHash } from './routes';

/**
 * Shows the current game in the address bar (#snake, #ch1-02) so the link
 * can be shared; null clears it (the menu).
 */
export function setHash(id: string | null): void {
  const hash = id ? `#${HASH_OF[id] ?? id}` : '';
  if (location.hash === hash) return;
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

/** Starts the level or arcade game with this menu id from `scene`. */
export function startById(scene: Phaser.Scene, id: string): void {
  const arcade = ARCADE_SCENES[id];
  if (arcade) scene.scene.start(arcade);
  else scene.scene.start('Level', { levelId: id });
}

/**
 * Opens the main menu over the current scene; picking an entry stops this
 * scene and starts the level or arcade game.
 */
export function openMainMenu(scene: Phaser.Scene): void {
  setHash(null);
  ui().showMenu((id) => startById(scene, id));
}
