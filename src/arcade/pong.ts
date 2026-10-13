import { floodLattice, type Lattice } from '../quantum/lattice';
import type { Rng } from '../quantum/rng';
import { Superposition } from '../quantum/superposition';
import { ClassicalTwin, SHOCK, spreadMultiplier, type Paradox } from './paradox';

/**
 * Tunable numbers of Quantum Pong (PLAN-IMPROVEMENTS.md §5). Lengths are in
 * lattice sites — two per visual cell, so the wave looks smooth.
 */
export const PONG = {
  /** The field: 9 × 16 visual cells. */
  cols: 18,
  rows: 32,
  /** Hopping rate at the start of a rally, the most it gets, and the rise per return (1/s). */
  hop: 6,
  maxHop: 10,
  hopPerReturn: 0.25,
  /** Wave number of the ball (rad/site): near π/2 a packet hardly spreads along its path. */
  k: 1.5,
  /** Width of the ball as it leaves a paddle or is served (sites). */
  width: 3,
  /** The steepest return off a paddle's edge, from straight ahead (radians). */
  maxAngle: (50 * Math.PI) / 180,
  /** Paddles: half-width (sites) and rows; AI at the top, the player at the bottom. */
  paddleHalf: 3,
  playerRows: [28, 29] as readonly number[],
  aiRows: [3, 4] as readonly number[],
  /** Goals: the rows behind each paddle. */
  playerGoal: [30, 31] as readonly number[],
  aiGoal: [0, 1] as readonly number[],
  /**
   * Detectors (paddles, goals) catch the ball at this many times the
   * hopping rate: about 2 absorbs a wave cleanly; a detector clicking every
   * frame would reflect it (Zeno mirror).
   */
  catchRate: 2,
  /** The thin wall in front of the AI's goal: row, columns, height (in units of the hopping rate). */
  wallRow: 2,
  wallCols: [5, 12] as readonly [number, number],
  wallHeight: 3,
  /** Paddle speeds (sites/s): the player's follows the finger; the AI's is slower. */
  playerSpeed: 40,
  aiSpeed: 13,
  /**
   * A look: a wide, blurry flashlight. Radius (sites), how often it catches
   * the ball in view (1/s), and its blur (sites). Tuned by simulation: a
   * late look near your paddle doubles your catches; a sharper look is worse
   * (the ball then spreads faster — uncertainty), and a small one mostly
   * misses and pushes the ball away (negative result).
   */
  lookRadius: 8,
  lookRate: 25,
  lookBlur: 2,
  /**
   * Game rule, not physics: looking costs energy ⚡ — so freezing the ball
   * by staring (Zeno) is not a free pause.
   */
  energy: 100,
  lookCost: 40,
  energyRegen: 12,
  /** Points to win a match; pause after a point (s). */
  winPoints: 7,
  servePause: 1,
  /** Score for the table: per point won, per match won. */
  pointScore: 10,
  winScore: 30,
} as const;

export type Side = 'player' | 'ai';

export interface PongInput {
  /** Where the paddle should go (site x of its centre), or null to stay. */
  paddle: number | null;
  /** Where to look (sites), or null. */
  look: { x: number; y: number } | null;
}

export type PongEvent =
  | { type: 'serve'; toward: Side }
  | { type: 'return'; side: Side; x: number; y: number; points: number }
  | { type: 'point'; winner: Side; x: number; y: number }
  /** A look found the ball. */
  | { type: 'seen'; side: Side; x: number; y: number }
  | {
      type: 'paradox';
      paradox: Paradox;
      x: number;
      y: number;
      from: { x: number; y: number };
    }
  | { type: 'over'; winner: Side };

/** A point ball for classical mode (S4). */
interface ClassicalBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Quantum Pong, engine-free (PLAN-IMPROVEMENTS.md §5). The ball is a wave
 * packet; paddles and goal lines are detectors. A look localizes the ball —
 * and the sharper the look, the faster it spreads afterwards (uncertainty);
 * keep looking and it freezes (Zeno), at a cost. The AI steers by the
 * classical expectation: the ball's average place.
 */
export class PongGame {
  readonly lattice: Lattice;
  psi: Superposition;
  /** Classical mode (S4): a point ball. */
  classical = false;
  private ball: ClassicalBall | null = null;
  paddles: Record<Side, number> = { player: PONG.cols / 2, ai: PONG.cols / 2 };
  energy: Record<Side, number> = { player: PONG.energy, ai: PONG.energy };
  /** Where each side is looking this frame (for drawing). */
  looking: Record<Side, { x: number; y: number } | null> = { player: null, ai: null };
  points: Record<Side, number> = { player: 0, ai: 0 };
  score = 0;
  rally = 0;
  over = false;
  /** Where the ball would be classically (S1): flown on in a straight line since last seen. */
  readonly twin = new ClassicalTwin(PONG.cols / 2, PONG.rows / 2);
  /** Seconds until the next serve (no ball in play meanwhile). */
  pause = 0;
  private serveTo: Side = 'player';
  /** The biggest chance the ball had to be in a goal since it was last caught. */
  private goalChance: Record<Side, number> = { player: 0, ai: 0 };
  private readonly potential: Float64Array;
  private readonly masks: { goal: Record<Side, number[]> };

  constructor(private readonly rng: Rng) {
    this.lattice = floodLattice({ col: 0, row: 0 }, (c, r) => this.inField(c, r));
    const n = this.lattice.size;
    this.potential = new Float64Array(n);
    const goal: Record<Side, number[]> = {
      player: new Array<number>(n).fill(0),
      ai: new Array<number>(n).fill(0),
    };
    for (let i = 0; i < n; i++) {
      const c = this.lattice.col[i]!;
      const r = this.lattice.row[i]!;
      if (this.isWall(c, r)) this.potential[i] = PONG.wallHeight;
      if (PONG.playerGoal.includes(r)) goal.player[i] = 1;
      if (PONG.aiGoal.includes(r)) goal.ai[i] = 1;
    }
    this.masks = { goal };
    this.psi = this.newPsi(PONG.hop);
    this.serve('player');
  }

  inField = (c: number, r: number): boolean => c >= 0 && c < PONG.cols && r >= 0 && r < PONG.rows;

  /** The thin wall in front of the AI's goal. */
  isWall(c: number, r: number): boolean {
    return r === PONG.wallRow && c >= PONG.wallCols[0] && c <= PONG.wallCols[1];
  }

  get hop(): number {
    return Math.min(PONG.maxHop, PONG.hop + PONG.hopPerReturn * this.rally);
  }

  private newPsi(hop: number): Superposition {
    const v = Array.from(this.potential, (x) => x * hop);
    return new Superposition(this.lattice, 0, hop, v);
  }

  /** Group velocity (sites/s) of a packet with wave vector k at hopping rate γ. */
  private velocity(kx: number, ky: number, hop: number) {
    return { vx: 2 * hop * Math.sin(kx), vy: 2 * hop * Math.sin(ky) };
  }

  /** A new packet at (x, y) flying at `angle` from straight up (dir −1) or down (dir +1). */
  private launch(x: number, y: number, angle: number, dir: -1 | 1): void {
    const hop = this.hop;
    const kx = PONG.k * Math.sin(angle);
    const ky = dir * PONG.k * Math.cos(angle);
    this.psi = this.newPsi(hop);
    this.psi.setWavePacket({ x, y }, PONG.width, { x: kx, y: ky });
    const v = this.velocity(kx, ky, hop);
    this.twin.seen(x, y, v.vx, v.vy);
    if (this.classical) this.ball = { x, y, ...v };
    this.goalChance = { player: 0, ai: 0 };
  }

  private serve(toward: Side): void {
    this.serveTo = toward;
    this.pause = PONG.servePause;
  }

  private doServe(events: PongEvent[]): void {
    const angle = (this.rng.next() - 0.5) * 0.8;
    this.launch(PONG.cols / 2 - 0.5, PONG.rows / 2, angle, this.serveTo === 'player' ? 1 : -1);
    events.push({ type: 'serve', toward: this.serveTo });
  }

  setClassical(on: boolean): void {
    this.classical = on;
    if (on) {
      const s = this.psi.stats();
      const v = { vx: this.twin.vx, vy: this.twin.vy };
      this.ball = { x: s.x, y: s.y, ...v };
    } else this.ball = null;
  }

  /** The ball's average place — what a classical player expects (S1). */
  expected(): { x: number; y: number; spread: number } {
    if (this.ball) return { x: this.ball.x, y: this.ball.y, spread: 0 };
    return this.psi.stats();
  }

  /** Which way the ball is going on average: −1 up (to the AI), +1 down (to the player). */
  heading(): -1 | 1 {
    return this.twin.vy < 0 ? -1 : 1;
  }

  update(dt: number, player: PongInput, ai: PongInput): PongEvent[] {
    const events: PongEvent[] = [];
    if (this.over) return events;
    this.movePaddle('player', player.paddle, PONG.playerSpeed, dt);
    this.movePaddle('ai', ai.paddle, PONG.aiSpeed, dt);
    for (const s of ['player', 'ai'] as const) {
      if (this.looking[s] === null)
        this.energy[s] = Math.min(PONG.energy, this.energy[s] + PONG.energyRegen * dt);
    }
    if (this.pause > 0) {
      this.pause -= dt;
      this.looking = { player: null, ai: null };
      if (this.pause <= 0) this.doServe(events);
      return events;
    }
    this.twin.step(dt);
    this.bounceTwin();
    if (this.classical) this.moveClassical(dt, events);
    else {
      this.psi.evolve(dt);
      this.look('player', player.look, dt, events);
      this.look('ai', ai.look, dt, events);
      this.detect(dt, events);
    }
    return events;
  }

  private movePaddle(side: Side, target: number | null, speed: number, dt: number): void {
    if (target === null) return;
    const lo = PONG.paddleHalf;
    const hi = PONG.cols - PONG.paddleHalf;
    const t = Math.min(hi, Math.max(lo, target));
    const d = t - this.paddles[side];
    this.paddles[side] += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
  }

  /** The classical twin bounces off the side walls like a classical ball. */
  private bounceTwin(): void {
    const t = this.twin;
    if (t.x < 0) {
      t.x = -t.x;
      t.vx = Math.abs(t.vx);
    } else if (t.x > PONG.cols - 1) {
      t.x = 2 * (PONG.cols - 1) - t.x;
      t.vx = -Math.abs(t.vx);
    }
  }

  private onPaddle(side: Side, c: number, r: number): boolean {
    const rows = side === 'player' ? PONG.playerRows : PONG.aiRows;
    return rows.includes(r) && Math.abs(c + 0.5 - this.paddles[side]) <= PONG.paddleHalf;
  }

  /** A look: a blurry position measurement in a circle; only in the looker's own half. */
  private look(
    side: Side,
    at: { x: number; y: number } | null,
    dt: number,
    events: PongEvent[],
  ): void {
    const half = (y: number) => (side === 'player' ? y >= PONG.rows / 2 : y < PONG.rows / 2);
    if (!at || !half(at.y) || this.energy[side] <= 0) {
      this.looking[side] = null;
      return;
    }
    this.looking[side] = at;
    this.energy[side] = Math.max(0, this.energy[side] - PONG.lookCost * dt);
    const { col, row, size } = this.lattice;
    const view = new Array<number>(size);
    for (let i = 0; i < size; i++)
      view[i] = Math.hypot(col[i]! + 0.5 - at.x, row[i]! + 0.5 - at.y) <= PONG.lookRadius ? 1 : 0;
    const out = this.psi.measureSoft(
      view,
      Math.min(1, PONG.lookRate * dt),
      PONG.lookBlur,
      this.rng,
    );
    if (out.kind !== 'found') return;
    const x = col[out.site]!;
    const y = row[out.site]!;
    events.push({ type: 'seen', side, x, y });
    const far = this.twin.farFrom(x, y);
    if (far) {
      // In visual cells (two sites each).
      const cells = Math.round(far.value / 2);
      if (cells >= SHOCK.farCells)
        events.push({
          type: 'paradox',
          paradox: { kind: 'far', value: cells },
          x,
          y,
          from: { x: this.twin.x, y: this.twin.y },
        });
    }
    // The classical guess starts again from here, with the average velocity the ball keeps.
    this.twin.seen(x, y);
  }

  /** Paddles and goals are detectors: a paddle that finds the ball returns it; a goal scores. */
  private detect(dt: number, events: PongEvent[]): void {
    const p = Math.min(1, PONG.catchRate * this.psi.hopRate * dt);
    const { col, row, size } = this.lattice;
    for (const side of ['player', 'ai'] as const) {
      // Remember how likely the ball was to be in each goal (for the negative result).
      let inGoal = 0;
      for (let i = 0; i < size; i++)
        if (this.masks.goal[side][i]) inGoal += this.psi.probability(i);
      this.goalChance[side] = Math.max(this.goalChance[side], inGoal);

      const paddle = new Array<number>(size);
      for (let i = 0; i < size; i++) paddle[i] = this.onPaddle(side, col[i]!, row[i]!) ? 1 : 0;
      const hit = this.psi.measureSoft(paddle, p, 0, this.rng);
      if (hit.kind === 'found') {
        this.returnBall(side, col[hit.site]!, row[hit.site]!, events);
        return;
      }
      const goal = this.psi.measureSoft(this.masks.goal[side], p, 0, this.rng);
      if (goal.kind === 'found') {
        this.scored(side === 'player' ? 'ai' : 'player', col[goal.site]!, row[goal.site]!, events);
        return;
      }
    }
  }

  private returnBall(side: Side, x: number, y: number, events: PongEvent[]): void {
    const spread = this.psi.stats().spread / 2;
    const offset = Math.max(-1, Math.min(1, (x + 0.5 - this.paddles[side]) / PONG.paddleHalf));
    const dir = side === 'player' ? -1 : 1;
    // A miss of the goal behind the paddle that was likely: name the negative result.
    if (this.goalChance[side] >= SHOCK.negativeChance)
      events.push({
        type: 'paradox',
        paradox: { kind: 'negative', value: this.goalChance[side] },
        x,
        y,
        from: { x, y: side === 'player' ? PONG.playerGoal[0]! : PONG.aiGoal[1]! },
      });
    this.rally++;
    let points = 0;
    if (side === 'player') {
      points = spreadMultiplier(spread);
      this.score += points;
    }
    this.launch(x, y, offset * PONG.maxAngle, dir);
    events.push({ type: 'return', side, x, y, points });
  }

  private scored(winner: Side, x: number, y: number, events: PongEvent[]): void {
    this.points[winner]++;
    if (winner === 'player') {
      this.score += PONG.pointScore;
      if (Math.abs(x - (PONG.wallCols[0] + PONG.wallCols[1]) / 2) <= 4 && y < PONG.wallRow) {
        // Behind the wall: the only way there was through it.
        if (x >= PONG.wallCols[0] && x <= PONG.wallCols[1])
          events.push({
            type: 'paradox',
            paradox: { kind: 'tunnel', value: 1 },
            x,
            y,
            from: { x, y: PONG.wallRow + 1 },
          });
      }
    }
    events.push({ type: 'point', winner, x, y });
    this.rally = 0;
    if (this.points[winner] >= PONG.winPoints) {
      if (winner === 'player') this.score += PONG.winScore;
      this.over = true;
      events.push({ type: 'over', winner });
      return;
    }
    this.serve(winner === 'player' ? 'ai' : 'player');
  }

  /** Classical mode: a point ball, walls, paddles; the thin wall stops it for good. */
  private moveClassical(dt: number, events: PongEvent[]): void {
    const b = this.ball;
    if (!b) return;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 0) {
      b.x = -b.x;
      b.vx = Math.abs(b.vx);
    } else if (b.x > PONG.cols - 1) {
      b.x = 2 * (PONG.cols - 1) - b.x;
      b.vx = -Math.abs(b.vx);
    }
    const c = Math.round(b.x);
    const r = Math.round(b.y);
    if (b.vy < 0 && this.isWall(c, r)) b.vy = Math.abs(b.vy);
    for (const side of ['player', 'ai'] as const) {
      const toward = side === 'player' ? b.vy > 0 : b.vy < 0;
      if (toward && this.onPaddle(side, c, r)) {
        this.returnBall(side, c, r, events);
        return;
      }
      const goal = side === 'player' ? PONG.playerGoal : PONG.aiGoal;
      if (goal.includes(r)) {
        this.scored(side === 'player' ? 'ai' : 'player', c, r, events);
        return;
      }
    }
  }
}

export type AiLevel = 'blind' | 'sometimes' | 'always';

/**
 * A computer player for `side`: it steers by the classical expectation —
 * the ball's average place — and may look to pin the ball down.
 */
export function aiInput(game: PongGame, side: Side, level: AiLevel, rng: Rng): PongInput {
  const e = game.expected();
  const coming = side === 'ai' ? game.heading() < 0 : game.heading() > 0;
  const paddle = coming ? e.x + 0.5 : PONG.cols / 2;
  // Looks late, a few rows before its paddle: then the ball has no time to spread again.
  const rows = side === 'ai' ? PONG.aiRows : PONG.playerRows;
  const near = Math.abs(e.y - rows[0]!) < 6;
  const wants = level === 'always' || (level === 'sometimes' && rng.next() < 0.5);
  const look =
    coming && near && wants && game.energy[side] > 10 && e.spread > 2
      ? { x: e.x + 0.5, y: e.y + 0.5 }
      : null;
  return { paddle, look };
}
