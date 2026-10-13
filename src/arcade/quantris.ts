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
  /** Of the quantum pieces: share in two orientations (not two places). */
  turnChance: 0.3,
  /** Chance that the next piece arrives entangled with the current one. */
  linkChance: 0.35,
  /**
   * Chance to tunnel through a one-cell overhang into the hole beneath it:
   * exp(−2κd) with d = 1 cell, κ = 0.8 (game rule for a whole tetromino).
   */
  tunnelChance: Math.exp(-2 * 0.8),
  /** Holding 👁 (Zeno) costs one look per this many seconds. */
  holdCost: 1,
  /** This many likelier outcomes in a row get a caption (the Born rule is no magic). */
  streak: 5,
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

/** One possible place of the falling piece: column and orientation. */
export interface Branch {
  x: number;
  rot: number;
  /** Probability (|amplitude|²) of this branch. */
  p: number;
}

export interface Piece {
  kind: number;
  y: number;
  /** One branch: a definite piece; two: a superposition of two places or two turns. */
  branches: Branch[];
  /**
   * Entangled with the piece before it: when that one settles in its branch
   * k, this one settles in branch 1 − k — at once, before it even appears.
   */
  linked: boolean;
}

export type QuantrisEvent =
  /** `chance`: the probability the kept place had (a rare one is worth naming). */
  | { type: 'collapsed'; kept: number; chance: number }
  /** The next piece settled at once, because the current one did (entanglement). */
  | { type: 'spooky'; kept: number; distance: number }
  | { type: 'merged' }
  /** The piece tunnelled `rows` rows down through a thin overhang. */
  | { type: 'tunnelled'; rows: number }
  /** `count` likelier outcomes in a row. */
  | { type: 'streak'; count: number }
  | { type: 'locked' }
  | { type: 'lines'; count: number }
  | { type: 'over' };

const cellsKey = (kind: number, b: Branch, y: number) =>
  pieceCells(kind, b.rot, b.x, y)
    .map(([cx, cy]) => `${cx},${cy}`)
    .sort()
    .join(';');

/**
 * Quantris, engine-free (PLAN.md §9.3, PLAN-IMPROVEMENTS.md §4.2). A piece may
 * arrive in superposition of two places or two orientations. Touching the
 * stack is a measurement: the Born rule picks which branch was real — if it
 * is the one that touched, the piece lands; if not, it falls on as a definite
 * piece. A look collapses it early; holding the look keeps it still (Zeno).
 * Two identical branches merge into one definite piece. The next piece may
 * be entangled with the current one; a piece on a thin overhang may tunnel.
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
  /** Classical physics (S4): every piece is definite. */
  private classical = false;
  /** The (definite) piece rests on the stack and locks after QUANTRIS.lockDelay. */
  grounded = false;
  /** 👁 held: the piece is watched and does not fall (Zeno). */
  holding = false;
  private holdAcc = 0;
  private fallAcc = 0;
  private lockAcc = 0;
  private lockResets = 0;
  private expected = 0;

  constructor(private readonly rng: Rng) {
    this.next = this.makePiece();
    this.spawn([]);
  }

  /** Switch classical physics on or off; on, pieces already in superposition settle in their likelier branch. */
  setClassical(on: boolean): void {
    this.classical = on;
    if (!on) return;
    for (const piece of [this.piece, this.next]) {
      const [a, b] = piece.branches;
      if (a && b) piece.branches = [{ ...(a.p >= b.p ? a : b), p: 1 }];
      piece.linked = false;
    }
  }

  get fallTime(): number {
    return Math.max(QUANTRIS.minFall, QUANTRIS.startFall * 0.85 ** (this.level - 1));
  }

  private makePiece(): Piece {
    const kind = Math.floor(this.rng.next() * SHAPES.length);
    const width = BOX[kind]!;
    const x0 = Math.floor((QUANTRIS.cols - width) / 2);
    if (this.classical || this.rng.next() >= QUANTRIS.quantumChance)
      return { kind, y: 0, branches: [{ x: x0, rot: 0, p: 1 }], linked: false };
    const p = this.rng.next() < 0.5 ? 0.5 : this.rng.next() < 0.5 ? 0.7 : 0.3;
    // The O looks the same turned: it can only be in two places.
    if (kind !== 1 && this.rng.next() < QUANTRIS.turnChance)
      return {
        kind,
        y: 0,
        branches: [
          { x: x0, rot: 0, p },
          { x: x0, rot: 1, p: 1 - p },
        ],
        linked: false,
      };
    // Two places a few columns apart, both inside the board.
    const shift = 2 + Math.floor(this.rng.next() * 3);
    const left = Math.max(0, x0 - Math.ceil(shift / 2));
    const right = Math.min(QUANTRIS.cols - width, left + shift);
    return {
      kind,
      y: 0,
      branches: [
        { x: left, rot: 0, p },
        { x: right, rot: 0, p: 1 - p },
      ],
      linked: false,
    };
  }

  private spawn(events: QuantrisEvent[]): void {
    this.piece = this.next;
    this.next = this.makePiece();
    // Entangle the newcomer with the piece now falling: opposite branches, mirrored chances.
    if (
      this.piece.branches.length === 2 &&
      this.next.branches.length === 2 &&
      this.rng.next() < QUANTRIS.linkChance
    ) {
      this.next.linked = true;
      this.next.branches[0]!.p = this.piece.branches[1]!.p;
      this.next.branches[1]!.p = this.piece.branches[0]!.p;
    }
    this.fallAcc = 0;
    this.grounded = false;
    this.lockAcc = 0;
    this.lockResets = 0;
    if (this.piece.branches.some((b) => !this.fits(this.piece.kind, b.rot, b.x, this.piece.y))) {
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
    const { kind, y } = this.piece;
    let moved = false;
    for (const b of this.piece.branches)
      if (this.fits(kind, b.rot, b.x + dx, y)) {
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
    const kicks = kind === 0 ? [0, -1, 1, -2, 2] : [0, -1, 1];
    const xs = this.piece.branches.map((b) => {
      const k = kicks.find((d) => this.fits(kind, b.rot + dir, b.x + d, y));
      return k === undefined ? null : b.x + k;
    });
    if (xs.some((x) => x === null)) return events;
    this.piece.branches.forEach((b, i) => {
      b.x = xs[i]!;
      b.rot += dir;
    });
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
    const { kind, y } = this.piece;
    return this.piece.branches.every((b) => this.fits(kind, b.rot, b.x, y + 1));
  }

  private mergeIfSame(events: QuantrisEvent[]): void {
    const [a, b] = this.piece.branches;
    const { kind, y } = this.piece;
    if (a && b && cellsKey(kind, a, y) === cellsKey(kind, b, y)) {
      // Identical branches are one and the same state: their amplitudes add up.
      this.piece.branches = [{ ...a, p: 1 }];
      // (An entangled next piece stays in superposition: nothing measured this one.)
      this.next.linked = false;
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

  /**
   * Hold the look (Zeno): the piece settles if it was in superposition, then
   * does not fall while watched. Costs a look now and one per holdCost seconds.
   */
  hold(on: boolean): QuantrisEvent[] {
    const events: QuantrisEvent[] = [];
    if (!on || this.over) {
      this.holding = false;
      return events;
    }
    if (this.holding || this.looks <= 0) return events;
    this.looks--;
    if (this.piece.branches.length === 2) this.collapse(events);
    this.holding = true;
    this.holdAcc = 0;
    return events;
  }

  private collapse(events: QuantrisEvent[]): number {
    const [a, b] = this.piece.branches as [Branch, Branch];
    const keep = this.rng.next() < a.p ? 0 : 1;
    const kept = keep === 0 ? a : b;
    this.piece.branches = [{ ...kept, p: 1 }];
    events.push({ type: 'collapsed', kept: keep, chance: kept.p });
    // The Born rule at work: likelier outcomes come up more often — no more.
    if (kept.p > 0.5) {
      if (++this.expected >= QUANTRIS.streak) {
        events.push({ type: 'streak', count: this.expected });
        this.expected = 0;
      }
    } else if (kept.p < 0.5) this.expected = 0;
    // Its entangled partner settles at once, in the opposite branch.
    if (this.next.linked && this.next.branches.length === 2) {
      const other = this.next.branches[1 - keep]!;
      const distance = Math.abs(other.x - kept.x) + Math.abs(other.rot - kept.rot);
      this.next.branches = [{ ...other, p: 1 }];
      this.next.linked = false;
      events.push({ type: 'spooky', kept: 1 - keep, distance });
    }
    return keep;
  }

  /**
   * One row down. Touching the stack measures which branch is real: if the
   * real one touched, the piece is grounded (and locks after the lock
   * delay); otherwise it keeps falling. Returns true if the piece moved down.
   */
  private fall(events: QuantrisEvent[]): boolean {
    const { kind, y } = this.piece;
    const blocked = this.piece.branches.map((b) => !this.fits(kind, b.rot, b.x, y + 1));
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

  /**
   * Where a definite piece resting here could tunnel to: the resting row
   * below a barrier at most one cell thick in each of its columns, with a
   * hole the piece fits in. Null if there is none.
   */
  tunnelTarget(y = this.piece.y): number | null {
    const [b] = this.piece.branches;
    if (this.classical || !b || this.piece.branches.length !== 1) return null;
    const { kind } = this.piece;
    if (this.fits(kind, b.rot, b.x, y + 1)) return null;
    const cells = pieceCells(kind, b.rot, b.x, y);
    for (let d = 2; y + d < QUANTRIS.rows; d++) {
      if (!this.fits(kind, b.rot, b.x, y + d)) continue;
      // Every column crosses at most one filled cell on the way: a thin barrier.
      const thin = cells.every(([cx, cy]) => {
        let filled = 0;
        for (let r = cy + 1; r < cy + d; r++) if (r >= 0 && this.board[r]![cx]! >= 0) filled++;
        return filled <= 1;
      });
      if (!thin) return null;
      let land = y + d;
      while (this.fits(kind, b.rot, b.x, land + 1)) land++;
      return land;
    }
    return null;
  }

  private lock(events: QuantrisEvent[]): void {
    const { kind } = this.piece;
    const b = this.piece.branches[0]!;
    // Locking is a measurement too: maybe the piece was already beneath the overhang.
    const target = this.tunnelTarget();
    if (target !== null && this.rng.next() < QUANTRIS.tunnelChance) {
      events.push({ type: 'tunnelled', rows: target - this.piece.y });
      this.piece.y = target;
    }
    const { y } = this.piece;
    for (const [cx, cy] of pieceCells(kind, b.rot, b.x, y)) if (cy >= 0) this.board[cy]![cx] = kind;
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
    this.holding = false;
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
    if (this.holding) {
      // Watched: nothing falls and nothing locks — but the looks run out.
      this.holdAcc += dt;
      if (this.holdAcc >= QUANTRIS.holdCost) {
        this.holdAcc -= QUANTRIS.holdCost;
        if (this.looks > 0) this.looks--;
        if (this.looks <= 0) this.holding = false;
      }
      return events;
    }
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
