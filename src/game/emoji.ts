import type Phaser from 'phaser';
import { EMOJI_FONT, EMOJI_TEXTURE_SIZE } from './constants';

/**
 * Renders an emoji once into a canvas texture and returns its key, so every
 * sprite is a cheap Image instead of a separate Text canvas.
 */
export function emojiTexture(scene: Phaser.Scene, emoji: string): string {
  const key = `emoji:${emoji}`;
  if (scene.textures.exists(key)) return key;

  const size = EMOJI_TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');

  ctx.font = `${Math.round(size * 0.8)}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Centre by the glyph's real ink box: emoji baselines differ between fonts.
  const m = ctx.measureText(emoji);
  const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const baseline = (size - inkHeight) / 2 + m.actualBoundingBoxAscent;
  ctx.fillText(emoji, size / 2, baseline);

  scene.textures.addCanvas(key, canvas);
  return key;
}
