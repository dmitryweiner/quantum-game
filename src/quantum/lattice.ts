/**
 * A lattice is the set of places a quantum object can be: grid cells
 * connected to their 4 neighbours. Amplitude only flows along its edges,
 * so walls are simply cells that are not part of the lattice.
 */
export interface Lattice {
  /** Number of sites. */
  readonly size: number;
  /** Grid coordinates of each site. */
  readonly col: Int32Array;
  readonly row: Int32Array;
  /** Neighbours of site i are nbr[nbrStart[i] .. nbrStart[i+1]). */
  readonly nbrStart: Int32Array;
  readonly nbr: Int32Array;
  /** Site index for a grid cell, or -1. */
  siteAt(col: number, row: number): number;
}

/**
 * Builds the lattice of all cells reachable from `start` through cells for
 * which `open(col, row)` holds (4-connected flood fill).
 */
export function floodLattice(
  start: { col: number; row: number },
  open: (col: number, row: number) => boolean,
): Lattice {
  const index = new Map<string, number>();
  const cols: number[] = [];
  const rows: number[] = [];
  const key = (c: number, r: number) => `${c},${r}`;
  if (!open(start.col, start.row)) throw new Error('floodLattice: start cell is not open');

  const queue: [number, number][] = [[start.col, start.row]];
  index.set(key(start.col, start.row), 0);
  cols.push(start.col);
  rows.push(start.row);
  for (let qi = 0; qi < queue.length; qi++) {
    const [c, r] = queue[qi]!;
    for (const [dc, dr] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      const k = key(nc, nr);
      if (index.has(k) || !open(nc, nr)) continue;
      index.set(k, cols.length);
      cols.push(nc);
      rows.push(nr);
      queue.push([nc, nr]);
    }
  }

  const size = cols.length;
  const nbrStart = new Int32Array(size + 1);
  const nbrList: number[] = [];
  for (let i = 0; i < size; i++) {
    nbrStart[i] = nbrList.length;
    for (const [dc, dr] of DIRS) {
      const j = index.get(key(cols[i]! + dc, rows[i]! + dr));
      if (j !== undefined) nbrList.push(j);
    }
  }
  nbrStart[size] = nbrList.length;

  return {
    size,
    col: Int32Array.from(cols),
    row: Int32Array.from(rows),
    nbrStart,
    nbr: Int32Array.from(nbrList),
    siteAt: (c, r) => index.get(key(c, r)) ?? -1,
  };
}

const DIRS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
