/**
 * Level maps are ASCII grids. Each character is looked up in `LEGEND`;
 * unknown characters are a hard error so typos are caught by tests.
 */

export type TileKind = 'floor' | 'wall';

export interface MapObject {
  /** Emoji used as the sprite. */
  emoji: string;
  col: number;
  row: number;
}

export interface ParsedMap {
  cols: number;
  rows: number;
  /** tiles[row][col] */
  tiles: TileKind[][];
  playerStart: { col: number; row: number };
  objects: MapObject[];
}

interface LegendEntry {
  tile: TileKind;
  emoji?: string;
  player?: true;
}

export const LEGEND: Readonly<Record<string, LegendEntry>> = {
  '.': { tile: 'floor' },
  '#': { tile: 'wall' },
  '@': { tile: 'floor', player: true },
  c: { tile: 'floor', emoji: '🐱' },
  k: { tile: 'floor', emoji: '🔑' },
  D: { tile: 'floor', emoji: '🚪' },
  L: { tile: 'floor', emoji: '💡' },
  a: { tile: 'floor', emoji: '⚛️' },
};

export function parseMap(lines: readonly string[]): ParsedMap {
  const rows = lines.length;
  if (rows === 0) throw new Error('parseMap: empty map');
  const cols = lines[0]?.length ?? 0;
  const tiles: TileKind[][] = [];
  const objects: MapObject[] = [];
  let playerStart: { col: number; row: number } | undefined;

  lines.forEach((line, row) => {
    if (line.length !== cols) {
      throw new Error(`parseMap: row ${row} has length ${line.length}, expected ${cols}`);
    }
    const tileRow: TileKind[] = [];
    [...line].forEach((ch, col) => {
      const entry = LEGEND[ch];
      if (!entry) throw new Error(`parseMap: unknown character '${ch}' at ${col},${row}`);
      tileRow.push(entry.tile);
      if (entry.player) {
        if (playerStart) throw new Error('parseMap: more than one player start');
        playerStart = { col, row };
      }
      if (entry.emoji) objects.push({ emoji: entry.emoji, col, row });
    });
    tiles.push(tileRow);
  });

  if (!playerStart) throw new Error('parseMap: no player start (@)');
  return { cols, rows, tiles, playerStart, objects };
}

/** Out-of-bounds cells count as walls. */
export function isWall(map: ParsedMap, col: number, row: number): boolean {
  return (map.tiles[row]?.[col] ?? 'wall') === 'wall';
}
