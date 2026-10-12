import Phaser from 'phaser';
import { installAudioUnlock } from './game/audio';
import { viewportSize, DPR } from './game/display';
import { BootScene } from './game/scenes/BootScene';
import { LevelScene } from './game/scenes/LevelScene';
import { SnakeScene } from './game/scenes/SnakeScene';
import { TanksScene } from './game/scenes/TanksScene';

installAudioUnlock();

const size = viewportSize();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0e1a',
  scale: {
    mode: Phaser.Scale.NONE,
    width: size.width,
    height: size.height,
    zoom: 1 / DPR,
  },
  input: { activePointers: 3 },
  disableContextMenu: true,
  scene: [BootScene, LevelScene, SnakeScene, TanksScene],
});

const onResize = () => {
  const s = viewportSize();
  game.scale.resize(s.width, s.height);
};
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

// Lets automated checks step frames by hand (`__game.step(t, dt)`) in dev builds.
if (import.meta.env.DEV) Object.assign(window, { __game: game });

// Offline play once installed (production only: a service worker would cache dev files).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // No offline mode; the game still works online.
    });
  });
}
