import type Phaser from 'phaser';
import { mulberry32 } from '../quantum/rng';

const SIZE = 128;
const ROWS = 4;
const BRICK_W = SIZE / 2;
const MORTAR = 5;
const REDS = ['#b4513a', '#a5462f', '#c05c42', '#9c4330', '#b9583c'];

/**
 * Brick wall tile drawn procedurally: the pattern repeats exactly at the
 * tile edges, so neighbouring wall cells join into one continuous wall.
 * A few variants differ only in brick colours.
 */
export function brickTexture(scene: Phaser.Scene, variant: number): string {
  const key = `bricks:${variant}`;
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  const rng = mulberry32(1000 + variant);

  ctx.fillStyle = '#4a2f27';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const rowH = SIZE / ROWS;
  for (let r = 0; r < ROWS; r++) {
    const offset = r % 2 === 0 ? 0 : -BRICK_W / 2;
    // One extra brick so the shifted row also covers the right edge.
    for (let b = 0; b <= SIZE / BRICK_W; b++) {
      const x = offset + b * BRICK_W + MORTAR / 2;
      const y = r * rowH + MORTAR / 2;
      const w = BRICK_W - MORTAR;
      const hgt = rowH - MORTAR;
      ctx.fillStyle = REDS[Math.floor(rng.next() * REDS.length)]!;
      ctx.fillRect(x, y, w, hgt);
      ctx.fillStyle = 'rgba(255, 220, 190, 0.18)';
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = 'rgba(40, 10, 5, 0.25)';
      ctx.fillRect(x, y + hgt - 3, w, 3);
    }
  }
  scene.textures.addCanvas(key, canvas);
  return key;
}

export const BRICK_VARIANTS = 3;
