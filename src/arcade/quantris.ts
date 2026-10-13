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
  /** Seconds a landed piece can still be moved or turned before it locks. */
  lockDelay: 0.5,
  /** How many moves or turns on the ground restart the lock delay. */
  lockResets: 3,
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
  /** `chance`: the probability the kept place had (a rare one is worth naming). */
  | { type: 'collapsed'; kept: number; chance: number }
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
  /** The (definite) piece rests on the stack and locks after QUANTRIS.lockDelay. */
  grounded = false;
  private fallAcc = 0;
  private lockAcc = 0;
  private lockResets = 0;

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
    this.grounded = false;
    this.lockAcc = 0;
    this.lockResets = 0;
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
    let moved = false;
    for (const b of this.piece.branches)
      if (this.fits(kind, rot, b.x + dx, y)) {
        b.x += dx;
        moved = true;
      }
    this.mergeIfSame(events);
    if (moved) this.afterShift();
    return events;
  }

  /**
   * Rotate a quarter turn (1 clockwise, -1 counter-clockwise), only if every
   * branch can. A branch against a wall or the stack is nudged sideways
   * (a wall kick) if that makes it fit.
   */
  rotate(dir: 1 | -1 = 1): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (this.over) return events;
    const { kind, y } = this.piece;
    const rot = this.piece.rot + dir;
    const kicks = kind === 0 ? [0, -1, 1, -2, 2] : [0, -1, 1];
    const xs = this.piece.branches.map((b) => {
      const k = kicks.find((d) => this.fits(kind, rot, b.x + d, y));
      return k === undefined ? null : b.x + k;
    });
    if (xs.some((x) => x === null)) return events;
    this.piece.rot = rot;
    this.piece.branches.forEach((b, i) => (b.x = xs[i]!));
    this.mergeIfSame(events);
    this.afterShift();
    return events;
  }

  /** A move or turn on the ground restarts the lock delay (a few times) and may let it fall again. */
  private afterShift(): void {
    if (!this.grounded) return;
    if (this.lockResets < QUANTRIS.lockResets) {
      this.lockResets++;
      this.lockAcc = 0;
    }
    if (this.canFall()) {
      this.grounded = false;
      this.fallAcc = 0;
    }
  }

  private canFall(): boolean {
    const { kind, rot, y } = this.piece;
    return this.piece.branches.every((b) => this.fits(kind, rot, b.x, y + 1));
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
    const kept = keep === 0 ? a : b;
    this.piece.branches = [{ x: kept.x, p: 1 }];
    events.push({ type: 'collapsed', kept: keep, chance: kept.p });
    return keep;
  }

  /**
   * One row down. Touching the stack measures which branch is real: if the
   * real one touched, the piece is grounded (and locks after the lock
   * delay); otherwise it keeps falling. Returns true if the piece moved down.
   */
  private fall(events: QuantrisEvent[]): boolean {
    const { kind, rot, y } = this.piece;
    const blocked = this.piece.branches.map((b) => !this.fits(kind, rot, b.x, y + 1));
    if (!blocked.some(Boolean)) {
      this.piece.y++;
      return true;
    }
    if (this.piece.branches.length === 2) {
      const kept = this.collapse(events);
      if (!blocked[kept]) {
        this.piece.y++;
        return true;
      }
    }
    if (!this.grounded) {
      this.grounded = true;
      this.lockAcc = 0;
    }
    return false;
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

  /** One row down now; on the ground it waits for the lock delay like any other fall. */
  softDrop(): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (!this.over && !this.grounded) {
      this.fall(events);
      this.fallAcc = 0;
    }
    return events;
  }

  /** All the way down and lock at once. */
  hardDrop(): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (this.over) return events;
    let guard = QUANTRIS.rows + 2;
    while (this.fall(events) && guard-- > 0) this.score += 1;
    this.lock(events);
    return events;
  }

  update(dt: number): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (this.over) return events;
    if (this.grounded) {
      this.lockAcc += dt;
      if (this.lockAcc >= QUANTRIS.lockDelay) this.lock(events);
      return events;
    }
    this.fallAcc += dt;
    while (this.fallAcc >= this.fallTime && !this.over && !this.grounded) {
      this.fallAcc -= this.fallTime;
      this.fall(events);
    }
    return events;
  }
}
