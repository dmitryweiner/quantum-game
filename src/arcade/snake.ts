import { blocksSight, isSolid, isWaveOpen, parseMap, type ParsedMap } from '../levels/map';
import { floodLattice } from '../quantum/lattice';
import type { Rng } from '../quantum/rng';
import { Superposition } from '../quantum/superposition';
import { cellSeen, type Cone } from '../game/systems/sight';
import type { QuantumBody } from '../game/systems/LevelSim';

export type Dir = 'up' | 'down' | 'left' | 'right';
const STEP: Readonly<Record<Dir, readonly [number, number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const OPPOSITE: Readonly<Record<Dir, Dir>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};
export const DIR_ANGLE: Readonly<Record<Dir, number>> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

/** Tunable numbers of the quantum snake (PLAN.md §9.1). */
export const SNAKE = {
  /** Seconds per step at the start (calm), and the fastest it gets. */
  startTick: 0.45,
  minTick: 0.15,
  /** Each apple — one more segment — makes a step this much shorter (multiplier). */
  speedUp: 0.95,
  /** How fast an unwatched apple spreads (hopping rate γ, 1/s). */
  appleHop: 0.6,
  /** The head's view: range in cells and half-angle. */
  viewRange: 4,
  viewHalfAngle: (30 * Math.PI) / 180,
  startLength: 3,
} as const;

export interface Cell {
  col: number;
  row: number;
}

export type SnakeEvent =
  | { type: 'collapsed'; apple: number; site: number }
  | { type: 'missed'; col: number; row: number }
  | { type: 'ate'; col: number; row: number }
  | { type: 'died' };

/**
 * Quantum snake, engine-free (PLAN.md §9.1). The apple is a quantum object
 * like the sandbox cat: it spreads while unwatched, the head's view cone
 * collapses it, a steady look freezes it (Zeno), and the head entering a cell
 * measures that cell — the apple is there with the chance its ghost shows.
 */
export class SnakeGame {
  readonly map: ParsedMap;
  body: Cell[];
  dir: Dir = 'up';
  private queued: Dir[] = [];
  readonly apples: QuantumBody[] = [];
  tick: number = SNAKE.startTick;
  private acc = 0;
  score = 0;
  alive = true;
  cone: Cone | null = null;
  private readonly open: (c: number, r: number) => boolean;

  constructor(
    arena: readonly string[],
    private readonly rng: Rng,
    apples = 1,
  ) {
    this.map = parseMap(arena);
    const s = this.map.playerStart;
    this.body = Array.from({ length: SNAKE.startLength }, (_, i) => ({
      col: s.col,
      row: s.row + i,
    }));
    this.open = (c, r) => isWaveOpen(this.map, c, r);
    for (let i = 0; i < apples; i++) this.spawnApple();
    this.updateCone();
  }

  get head(): Cell {
    return this.body[0]!;
  }

  /** Queue a turn (two can be queued so quick double taps work); no U-turns. */
  turn(d: Dir): void {
    const last = this.queued[this.queued.length - 1] ?? this.dir;
    if (d === last || d === OPPOSITE[last] || this.queued.length >= 2) return;
    this.queued.push(d);
  }

  private occupied(c: number, r: number): boolean {
    return this.body.some((b) => b.col === c && b.row === r);
  }

  /** A new apple appears, definite, on a free floor cell away from the head. */
  private spawnApple(index = this.apples.length): void {
    const free: Cell[] = [];
    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        const far = Math.abs(c - this.head?.col) + Math.abs(r - this.head?.row) > 4;
        if (!isSolid(this.map, c, r) && !this.occupied(c, r) && (far || !this.body.length))
          free.push({ col: c, row: r });
      }
    }
    const at = free[Math.floor(this.rng.next() * free.length)] ?? this.map.playerStart;
    const lattice = floodLattice(at, this.open);
    const psi = new Superposition(lattice, lattice.siteAt(at.col, at.row), SNAKE.appleHop);
    const body: QuantumBody = {
      def: { char: 'a', role: 'quantum', emoji: '🍎', col: at.col, row: at.row },
      psi,
      seen: new Array<boolean>(lattice.size).fill(false),
    };
    this.apples[index] = body;
  }

  private updateCone(): void {
    const h = this.head;
    this.cone = {
      origin: { x: h.col + 0.5, y: h.row + 0.5 },
      angle: DIR_ANGLE[this.dir],
      range: SNAKE.viewRange,
      halfAngle: SNAKE.viewHalfAngle,
    };
  }

  update(dt: number): SnakeEvent[] {
    const events: SnakeEvent[] = [];
    if (!this.alive) return events;

    // Apples spread while unwatched; the head's view measures them every frame.
    this.apples.forEach((apple, index) => {
      apple.psi.evolve(dt);
      const { lattice } = apple.psi;
      for (let i = 0; i < lattice.size; i++) {
        apple.seen[i] =
          this.cone !== null &&
          cellSeen(this.cone, lattice.col[i]!, lattice.row[i]!, (c, r) =>
            blocksSight(this.map, c, r),
          );
      }
      const wasDefinite = apple.psi.definiteSite() >= 0;
      const out = apple.psi.measure(apple.seen, this.rng);
      if (out.kind === 'found' && !wasDefinite)
        events.push({ type: 'collapsed', apple: index, site: out.site });
    });

    this.acc += dt;
    while (this.acc >= this.tick && this.alive) {
      this.acc -= this.tick;
      this.step(events);
    }
    return events;
  }

  private step(events: SnakeEvent[]): void {
    this.dir = this.queued.shift() ?? this.dir;
    const [dc, dr] = STEP[this.dir];
    const next = { col: this.head.col + dc, row: this.head.row + dr };
    const tail = this.body[this.body.length - 1]!;
    const hitsSelf = this.body.some(
      (b) => b.col === next.col && b.row === next.row && !(b === tail),
    );
    if (isSolid(this.map, next.col, next.row) || hitsSelf) {
      this.alive = false;
      events.push({ type: 'died' });
      return;
    }
    this.body.unshift(next);
    let grew = false;
    // The head entering a cell measures it.
    this.apples.forEach((apple, index) => {
      const site = apple.psi.lattice.siteAt(next.col, next.row);
      if (site < 0) return;
      const mask = new Array<boolean>(apple.psi.lattice.size).fill(false);
      mask[site] = true;
      const out = apple.psi.measure(mask, this.rng);
      if (out.kind === 'found') {
        grew = true;
        this.score++;
        this.tick = Math.max(SNAKE.minTick, this.tick * SNAKE.speedUp);
        events.push({ type: 'ate', col: next.col, row: next.row });
        this.spawnApple(index);
      } else if (out.kind === 'absent') {
        events.push({ type: 'missed', col: next.col, row: next.row });
      }
    });
    if (!grew) this.body.pop();
    this.updateCone();
  }
}
