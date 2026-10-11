import Phaser from 'phaser';
import { viewportSize, DPR } from './game/display';
import { BootScene } from './game/scenes/BootScene';
import { LevelScene } from './game/scenes/LevelScene';

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
  scene: [BootScene, LevelScene],
});

const onResize = () => {
  const s = viewportSize();
  game.scale.resize(s.width, s.height);
};
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

// Lets automated checks step frames by hand (`__game.step(t, dt)`) in dev builds.
if (import.meta.env.DEV) Object.assign(window, { __game: game });
