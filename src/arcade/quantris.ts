import type { Rng } from '../quantum/rng';

/** Tunable numbers of Quantris (PLAN.md §9.3). */
export const QUANTRIS = {
  cols: 10,
  rows: 20,
  /** Seconds per row at level 1, and the fastest. */
  startFall: 0.8,
  minFall: 0.08,
  /** Chance that a new piece arrives in superposition. */
  quantumChance: 0.75,
  /** Looks (early collapses) at the start, the most you can hold. */
  looks: 3,
  maxLooks: 5,
  linesPerLevel: 10,
} as const;

type Shape = readonly (readonly [number, number])[];

/** The seven tetrominoes, as cell offsets in their spawn orientation. */
const SHAPES: readonly Shape[] = [
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
  ], // I
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ], // O
  [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ], // T
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ], // S
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ], // Z
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ], // J
  [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ], // L
];
/** Size of each shape's rotation box. */
const BOX = [4, 2, 3, 3, 3, 3, 3];

/** Cells of shape `kind` rotated `rot` quarter turns clockwise, at (x, y). */
export function pieceCells(kind: number, rot: number, x: number, y: number): [number, number][] {
  const n = BOX[kind]!;
  return SHAPES[kind]!.map(([cx, cy]) => {
    let px = cx;
    let py = cy;
    for (let i = 0; i < ((rot % 4) + 4) % 4; i++) [px, py] = [n - 1 - py, px];
    return [x + px, y + py];
  });
}

/** One possible position of the falling piece. */
export interface Branch {
  x: number;
  /** Probability (|amplitude|²) of this branch. */
  p: number;
}

export interface Piece {
  kind: number;
  rot: number;
  y: number;
  /** One branch: a definite piece; two: a superposition of two places. */
  branches: Branch[];
}

export type QuantrisEvent =
  | { type: 'collapsed'; kept: number }
  | { type: 'merged' }
  | { type: 'locked' }
  | { type: 'lines'; count: number }
  | { type: 'over' };

/**
 * Quantris, engine-free (PLAN.md §9.3). A piece may arrive in superposition
 * of two horizontal places. Touching the stack is a measurement: the Born
 * rule picks which place was real — if it is the one that touched, the piece
 * lands; if not, it falls on as a definite piece. A look collapses it early.
 * Two branches pushed onto the same place merge into one definite piece.
 */
export class QuantrisGame {
  readonly board: number[][] = Array.from({ length: QUANTRIS.rows }, () =>
    new Array<number>(QUANTRIS.cols).fill(-1),
  );
  piece!: Piece;
  next!: Piece;
  looks: number = QUANTRIS.looks;
  score = 0;
  lines = 0;
  level = 1;
  over = false;
  private fallAcc = 0;

  constructor(private readonly rng: Rng) {
    this.next = this.makePiece();
    this.spawn([]);
  }

  get fallTime(): number {
    return Math.max(QUANTRIS.minFall, QUANTRIS.startFall * 0.85 ** (this.level - 1));
  }

  private makePiece(): Piece {
    const kind = Math.floor(this.rng.next() * SHAPES.length);
    const width = BOX[kind]!;
    const x0 = Math.floor((QUANTRIS.cols - width) / 2);
    if (this.rng.next() >= QUANTRIS.quantumChance)
      return { kind, rot: 0, y: 0, branches: [{ x: x0, p: 1 }] };
    // Two places a few columns apart, both inside the board.
    const shift = 2 + Math.floor(this.rng.next() * 3);
    const left = Math.max(0, x0 - Math.ceil(shift / 2));
    const right = Math.min(QUANTRIS.cols - width, left + shift);
    const p = this.rng.next() < 0.5 ? 0.5 : this.rng.next() < 0.5 ? 0.7 : 0.3;
    return {
      kind,
      rot: 0,
      y: 0,
      branches: [
        { x: left, p },
        { x: right, p: 1 - p },
      ],
    };
  }

  private spawn(events: QuantrisEvent[]): void {
    this.piece = this.next;
    this.next = this.makePiece();
    this.fallAcc = 0;
    if (
      this.piece.branches.some(
        (b) => !this.fits(this.piece.kind, this.piece.rot, b.x, this.piece.y),
      )
    ) {
      this.over = true;
      events.push({ type: 'over' });
    }
  }

  fits(kind: number, rot: number, x: number, y: number): boolean {
    return pieceCells(kind, rot, x, y).every(
      ([cx, cy]) =>
        cx >= 0 && cx < QUANTRIS.cols && cy < QUANTRIS.rows && (cy < 0 || this.board[cy]![cx]! < 0),
    );
  }

  /**
   * Shift left/right. Each branch moves if it can; one stuck against a wall
   * lets the other catch up — and branches that meet merge into one.
   */
  move(dx: -1 | 1): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (this.over) return events;
    const { kind, rot, y } = this.piece;
    for (const b of this.piece.branches) if (this.fits(kind, rot, b.x + dx, y)) b.x += dx;
    this.mergeIfSame(events);
    return events;
  }

  /** Rotate clockwise, only if every branch can. */
  rotate(): void {
    if (this.over) return;
    const { kind, y } = this.piece;
    const rot = this.piece.rot + 1;
    if (this.piece.branches.every((b) => this.fits(kind, rot, b.x, y))) this.piece.rot = rot;
  }

  private mergeIfSame(events: QuantrisEvent[]): void {
    const [a, b] = this.piece.branches;
    if (a && b && a.x === b.x) {
      // Identical branches are one and the same state: their amplitudes add up.
      this.piece.branches = [{ x: a.x, p: 1 }];
      events.push({ type: 'merged' });
    }
  }

  /** Look: collapse the piece now (costs a look). */
  look(): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (this.over || this.piece.branches.length < 2 || this.looks <= 0) return events;
    this.looks--;
    this.collapse(events);
    return events;
  }

  private collapse(events: QuantrisEvent[], prefer?: number): number {
    const [a, b] = this.piece.branches as [Branch, Branch];
    const keep = prefer ?? (this.rng.next() < a.p ? 0 : 1);
    this.piece.branches = [{ x: (keep === 0 ? a : b).x, p: 1 }];
    events.push({ type: 'collapsed', kept: keep });
    return keep;
  }

  /**
   * One row down. Touching the stack measures which branch is real: if the
   * real one touched, the piece locks; otherwise it keeps falling.
   * Returns true if the piece locked.
   */
  private fall(events: QuantrisEvent[]): boolean {
    const { kind, rot, y } = this.piece;
    const blocked = this.piece.branches.map((b) => !this.fits(kind, rot, b.x, y + 1));
    if (!blocked.some(Boolean)) {
      this.piece.y++;
      return false;
    }
    if (this.piece.branches.length === 2 && blocked[0] !== blocked[1]) {
      const kept = this.collapse(events);
      if (!blocked[kept]) {
        this.piece.y++;
        return false;
      }
    } else if (this.piece.branches.length === 2) {
      this.collapse(events);
    }
    this.lock(events);
    return true;
  }

  private lock(events: QuantrisEvent[]): void {
    const { kind, rot, y } = this.piece;
    const x = this.piece.branches[0]!.x;
    for (const [cx, cy] of pieceCells(kind, rot, x, y)) if (cy >= 0) this.board[cy]![cx] = kind;
    events.push({ type: 'locked' });
    const full = this.board
      .map((row, i) => (row.every((c) => c >= 0) ? i : -1))
      .filter((i) => i >= 0);
    if (full.length) {
      for (const i of full) {
        this.board.splice(i, 1);
        this.board.unshift(new Array<number>(QUANTRIS.cols).fill(-1));
      }
      this.lines += full.length;
      this.score += [0, 100, 300, 500, 800][full.length]! * this.level;
      this.looks = Math.min(QUANTRIS.maxLooks, this.looks + full.length);
      this.level = 1 + Math.floor(this.lines / QUANTRIS.linesPerLevel);
      events.push({ type: 'lines', count: full.length });
    }
    this.spawn(events);
  }

  softDrop(): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (!this.over) {
      this.fall(events);
      this.fallAcc = 0;
    }
    return events;
  }

  hardDrop(): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (this.over) return events;
    let guard = QUANTRIS.rows + 2;
    while (!this.fall(events) && guard-- > 0) this.score += 1;
    return events;
  }

  update(dt: number): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (this.over) return events;
    this.fallAcc += dt;
    while (this.fallAcc >= this.fallTime && !this.over) {
      this.fallAcc -= this.fallTime;
      this.fall(events);
    }
    return events;
  }
}
