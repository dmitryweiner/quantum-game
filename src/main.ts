import Phaser from 'phaser';
import { viewportSize, DPR } from './game/display';
import { BootScene } from './game/scenes/BootScene';
import { PlayScene } from './game/scenes/PlayScene';

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
  scene: [BootScene, PlayScene],
});

const onResize = () => {
  const s = viewportSize();
  game.scale.resize(s.width, s.height);
};
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
