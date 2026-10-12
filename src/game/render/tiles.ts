import type Phaser from 'phaser';
import type { ParsedMap } from '../../levels/map';
import { CELL, COLORS } from '../constants';
import { BRICK_VARIANTS, brickTexture } from '../textures';

/** Draws floor, brick walls, glass and force fields of a map into `layer`. */
export function drawTiles(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Layer,
  map: ParsedMap,
): void {
  const g = scene.add.graphics();
  layer.add(g);
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const x = col * CELL;
      const y = row * CELL;
      const tile = map.tiles[row]![col]!;
      if (tile === 'wall') {
        layer.add(
          scene.add
            .image(
              x + CELL / 2,
              y + CELL / 2,
              brickTexture(scene, (col * 7 + row * 3) % BRICK_VARIANTS),
            )
            .setDisplaySize(CELL, CELL),
        );
      } else if (tile === 'barrier') {
        // A force field: violet, with ripples.
        g.fillStyle(COLORS.barrier, 0.45);
        g.fillRect(x, y, CELL, CELL);
        g.lineStyle(2, COLORS.barrier, 0.9);
        for (let k = 1; k <= 3; k++) {
          const yy = y + (k * CELL) / 4;
          g.beginPath();
          g.moveTo(x, yy);
          for (let t = 0; t <= 8; t++) g.lineTo(x + (t * CELL) / 8, yy + Math.sin(t * 1.6 + k) * 3);
          g.strokePath();
        }
      } else if (tile === 'glass') {
        g.fillStyle(COLORS.glass, 0.12);
        g.fillRect(x, y, CELL, CELL);
        g.lineStyle(3, COLORS.glass, 0.6);
        g.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
        g.lineStyle(2, COLORS.glass, 0.4);
        g.lineBetween(x + 14, y + CELL - 14, x + CELL - 14, y + 14);
      } else {
        g.fillStyle(COLORS.floor, 1);
        g.fillRect(x, y, CELL, CELL);
        g.lineStyle(1, COLORS.floorLine, 1);
        g.strokeRect(x, y, CELL, CELL);
      }
    }
  }
}

/**
 * Zooms and centres `cam` so a `cols`×`rows` map fits the screen area below
 * `top` (canvas pixels) and above `bottom`, with side `margin`s.
 */
export function fitCamera(
  cam: Phaser.Cameras.Scene2D.Camera,
  screen: { width: number; height: number },
  map: { cols: number; rows: number },
  area: { top: number; bottom: number; side: number },
): void {
  const w = screen.width - 2 * area.side;
  const h = screen.height - area.top - area.bottom;
  const mapW = map.cols * CELL;
  const mapH = map.rows * CELL;
  const zoom = Math.min(w / mapW, h / mapH) * 0.96;
  cam.setZoom(zoom);
  cam.centerOn(mapW / 2, mapH / 2 - (area.top + h / 2 - screen.height / 2) / zoom);
}
