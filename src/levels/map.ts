/**
 * Level maps are ASCII grids. Each character is looked up in `LEGEND`;
 * unknown characters are a hard error so typos are caught by tests.
 */

/** Walls stop everything; glass stops movement but not sight. */
export type TileKind = 'floor' | 'wall' | 'glass';

/**
 * - `quantum`: lives in superposition when unobserved (the cat).
 * - `target`: a cell where a quantum object must be caught (the door).
 * - `decor`: just a picture.
 */
export type ObjectRole = 'quantum' | 'target' | 'decor';

export interface MapObject {
  char: string;
  role: ObjectRole;
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
  object?: { role: ObjectRole; emoji: string };
  player?: true;
}

export const LEGEND: Readonly<Record<string, LegendEntry>> = {
  '.': { tile: 'floor' },
  '#': { tile: 'wall' },
  '=': { tile: 'glass' },
  '@': { tile: 'floor', player: true },
  c: { tile: 'floor', object: { role: 'quantum', emoji: '🐱' } },
  D: { tile: 'floor', object: { role: 'target', emoji: '🚪' } },
  k: { tile: 'floor', object: { role: 'decor', emoji: '🔑' } },
  L: { tile: 'floor', object: { role: 'decor', emoji: '💡' } },
  a: { tile: 'floor', object: { role: 'decor', emoji: '⚛️' } },
  p: { tile: 'floor', object: { role: 'decor', emoji: '🪴' } },
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
      if (entry.object) objects.push({ char: ch, ...entry.object, col, row });
    });
    tiles.push(tileRow);
  });

  if (!playerStart) throw new Error('parseMap: no player start (@)');
  return { cols, rows, tiles, playerStart, objects };
}

/** Out-of-bounds cells count as walls. */
export function tileAt(map: ParsedMap, col: number, row: number): TileKind {
  return map.tiles[row]?.[col] ?? 'wall';
}

/** Blocks movement (walls and glass). */
export function isSolid(map: ParsedMap, col: number, row: number): boolean {
  return tileAt(map, col, row) !== 'floor';
}

/** Blocks sight (walls only). */
export function blocksSight(map: ParsedMap, col: number, row: number): boolean {
  return tileAt(map, col, row) === 'wall';
}

/** Swaps rows and columns, so a wide level can be shown tall on a portrait screen. */
export function transposeMap(lines: readonly string[]): string[] {
  const rows = lines.map((l) => [...l]);
  const cols = rows[0]?.length ?? 0;
  return Array.from({ length: cols }, (_, c) => rows.map((r) => r[c] ?? '').join(''));
}
