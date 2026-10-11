import {
  blocksSight,
  isSolid,
  parseMap,
  transposeMap,
  type MapObject,
  type ParsedMap,
} from '../../levels/map';
import type { LevelDef } from '../../levels/types';
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

export type SimEvent =
  { type: 'collapsed'; body: number; site: number } | { type: 'won' } | { type: 'lost' };

export type SimStatus = 'playing' | 'won' | 'lost';

/**
 * Engine-free game state of one level attempt (PLAN.md §4.2): moves the
 * observer, evolves unobserved objects, measures observed ones and checks
 * the win condition. The Phaser scene only renders it, and tests can play
 * a level headlessly.
 */
export class LevelSim {
  readonly map: ParsedMap;
  readonly bodies: QuantumBody[];
  player: Vec2;
  /** Current field of view, or null with eyes closed. */
  cone: Cone | null = null;
  time = 0;
  status: SimStatus = 'playing';
  private readonly targets: { col: number; row: number }[];

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

  /**
   * @param move desired direction, length ≤ 1
   * @param gaze point looked at (cell units), or null with eyes closed
   */
  step(dt: number, move: Vec2, gaze: Vec2 | null): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.status !== 'playing') return events;
    this.time += dt;

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
        body.seen[i] =
          this.cone !== null && cellSeen(this.cone, lattice.col[i]!, lattice.row[i]!, this.opaque);
      }
      const wasDefinite = body.psi.definiteSite() >= 0;
      const out = body.psi.measure(body.seen, this.rng);
      if (out.kind !== 'found') return;
      if (!wasDefinite) events.push({ type: 'collapsed', body: index, site: out.site });
      const col = lattice.col[out.site];
      const row = lattice.row[out.site];
      if (this.targets.some((t) => t.col === col && t.row === row)) won = true;
    });

    if (won) {
      this.status = 'won';
      events.push({ type: 'won' });
    } else if (this.timeLeft === 0) {
      this.status = 'lost';
      events.push({ type: 'lost' });
    }
    return events;
  }
}
