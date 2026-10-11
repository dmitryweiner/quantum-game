import {
  blocksSight,
  isSolid,
  parseMap,
  transposeMap,
  type Basis,
  type MapObject,
  type ParsedMap,
} from '../../levels/map';
import type { LevelDef } from '../../levels/types';
import {
  EntangledPair,
  X_ANGLE,
  Z_ANGLE,
  type LocalState,
  type Outcome,
} from '../../quantum/entangled';
import { floodLattice } from '../../quantum/lattice';
import type { Rng } from '../../quantum/rng';
import { Superposition } from '../../quantum/superposition';
import { GAZE, PLAYER } from '../constants';
import { moveWithCollisions, type Vec2 } from './movement';
import { cellSeen, type Cone } from './sight';

export interface QuantumBody {
  def: MapObject;
  psi: Superposition;
  /** Per lattice site: is it inside the observer's view this frame? */
  seen: boolean[];
}

export type LossReason = 'time' | 'wrong-colour';

export type SimEvent =
  | { type: 'collapsed'; body: number; site: number }
  /** A ball of the pair got a new definite colour (side 1 may change without being seen). */
  | { type: 'qubit-changed'; side: 0 | 1 }
  | { type: 'plate'; plate: MapObject; lockOutcome: Outcome }
  | { type: 'won' }
  | { type: 'lost'; reason: LossReason };

export type SimStatus = 'playing' | 'won' | 'lost';

export const BASIS_ANGLE: Readonly<Record<Basis, number>> = { Z: Z_ANGLE, X: X_ANGLE };

/**
 * Engine-free game state of one level attempt (PLAN.md §4.2): moves the
 * observer, evolves unobserved objects, measures observed ones and checks
 * the win condition. The Phaser scene only renders it, and tests can play
 * a level headlessly.
 */
export class LevelSim {
  readonly map: ParsedMap;
  readonly bodies: QuantumBody[];
  /** The entangled pair, if the level has one. */
  readonly pair: EntangledPair | null;
  readonly qubits: MapObject[];
  player: Vec2;
  glasses: Basis = 'Z';
  /** Current field of view, or null with eyes closed. */
  cone: Cone | null = null;
  time = 0;
  status: SimStatus = 'playing';
  lossReason: LossReason | null = null;
  private readonly targets: MapObject[];
  private readonly plates: MapObject[];

  constructor(
    readonly level: LevelDef,
    private readonly rng: Rng,
    /** Play the level with rows and columns swapped (portrait screens). */
    transposed = false,
  ) {
    this.map = parseMap(transposed ? transposeMap(level.map) : level.map);
    const s = this.map.playerStart;
    this.player = { x: s.col + 0.5, y: s.row + 0.5 };
    this.targets = this.map.objects.filter((o) => o.role === 'target');
    this.plates = this.map.objects.filter((o) => o.role === 'plate');
    this.qubits = this.map.objects.filter((o) => o.role === 'qubit');
    this.pair = this.qubits.length > 0 ? new EntangledPair() : null;
    const open = (c: number, r: number) => !isSolid(this.map, c, r);
    this.bodies = this.map.objects
      .filter((o) => o.role === 'quantum')
      .map((def) => {
        const lattice = floodLattice(def, open);
        const psi = new Superposition(
          lattice,
          lattice.siteAt(def.col, def.row),
          level.hopRate ?? 1,
        );
        return { def, psi, seen: new Array<boolean>(lattice.size).fill(false) };
      });
  }

  get timeLeft(): number | null {
    return this.level.timeLimit === undefined
      ? null
      : Math.max(0, this.level.timeLimit - this.time);
  }

  solid = (c: number, r: number): boolean => isSolid(this.map, c, r);
  opaque = (c: number, r: number): boolean => blocksSight(this.map, c, r);

  toggleGlasses(): void {
    if (this.level.glasses) this.glasses = this.glasses === 'Z' ? 'X' : 'Z';
  }

  /**
   * @param move desired direction, length ≤ 1
   * @param gaze point looked at (cell units), or null with eyes closed
   */
  step(dt: number, move: Vec2, gaze: Vec2 | null): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.status !== 'playing') return events;
    this.time += dt;

    const cellBefore = this.playerCell();
    // Sub-steps keep each move well below one cell even on a long frame.
    const steps = Math.max(1, Math.ceil(PLAYER.speed * dt * 4));
    const d = (PLAYER.speed * dt) / steps;
    for (let i = 0; i < steps; i++) {
      this.player = moveWithCollisions(
        this.player,
        { x: move.x * d, y: move.y * d },
        PLAYER.radius,
        this.solid,
      );
    }

    this.cone =
      gaze === null
        ? null
        : {
            origin: this.player,
            angle: Math.atan2(gaze.y - this.player.y, gaze.x - this.player.x),
            range: GAZE.range,
            halfAngle: GAZE.halfAngle,
          };

    let won = false;
    this.bodies.forEach((body, index) => {
      body.psi.evolve(dt);
      const { lattice } = body.psi;
      for (let i = 0; i < lattice.size; i++) {
        body.seen[i] = this.sees(lattice.col[i]!, lattice.row[i]!);
      }
      const wasDefinite = body.psi.definiteSite() >= 0;
      const out = body.psi.measure(body.seen, this.rng);
      if (out.kind !== 'found') return;
      if (!wasDefinite) events.push({ type: 'collapsed', body: index, site: out.site });
      const col = lattice.col[out.site];
      const row = lattice.row[out.site];
      if (this.targets.some((t) => t.col === col && t.row === row)) won = true;
    });

    this.observeQubits(events);

    const cell = this.playerCell();
    if (cell.col !== cellBefore.col || cell.row !== cellBefore.row) {
      const plate = this.plates.find((p) => p.col === cell.col && p.row === cell.row);
      if (plate?.plate && this.pair && this.level.winCondition.type === 'unlock') {
        // The lock measures the far ball in the plate's colours.
        const before = this.pair.local[1];
        const lockOutcome = this.pair.measure(1, BASIS_ANGLE[plate.plate.basis], this.rng);
        this.pushQubitChange(events, 1, before);
        events.push({ type: 'plate', plate, lockOutcome });
        if (lockOutcome === plate.plate.outcome) won = true;
        else return this.lose(events, 'wrong-colour');
      }
    }

    if (won) {
      this.status = 'won';
      events.push({ type: 'won' });
    } else if (this.timeLeft === 0) {
      this.lose(events, 'time');
    }
    return events;
  }

  playerCell(): { col: number; row: number } {
    return { col: Math.floor(this.player.x), row: Math.floor(this.player.y) };
  }

  private sees(col: number, row: number): boolean {
    return this.cone !== null && cellSeen(this.cone, col, row, this.opaque);
  }

  /** Each ball in view is measured through the current glasses, every frame. */
  private observeQubits(events: SimEvent[]): void {
    if (!this.pair) return;
    for (const q of this.qubits) {
      if (!this.sees(q.col, q.row)) continue;
      const side = q.side ?? 0;
      const before = this.pair.local[side];
      const partnerBefore = this.pair.local[side === 0 ? 1 : 0];
      this.pair.measure(side, BASIS_ANGLE[this.glasses], this.rng);
      this.pushQubitChange(events, side, before);
      this.pushQubitChange(events, side === 0 ? 1 : 0, partnerBefore);
    }
  }

  private pushQubitChange(events: SimEvent[], side: 0 | 1, before: LocalState | null): void {
    const now = this.pair?.local[side];
    if (!now) return;
    if (before?.angle !== now.angle || before.outcome !== now.outcome) {
      events.push({ type: 'qubit-changed', side });
    }
  }

  private lose(events: SimEvent[], reason: LossReason): SimEvent[] {
    this.status = 'lost';
    this.lossReason = reason;
    events.push({ type: 'lost', reason });
    return events;
  }
}
