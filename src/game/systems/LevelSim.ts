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
import { Qubit, RabiSystem } from '../../quantum/qubit';
import { pickWeighted } from '../../quantum/rng';
import { Superposition } from '../../quantum/superposition';
import { GAZE, PLAYER } from '../constants';
import { moveWithCollisions, type Vec2 } from './movement';
import { cellSeen, cellVisibility, type Cone } from './sight';

export interface QuantumBody {
  def: MapObject;
  psi: Superposition;
  /** Per lattice site: is it inside the observer's view this frame? */
  seen: boolean[];
}

export interface Lamp {
  def: MapObject;
  q: Qubit;
}

export interface Flower {
  def: MapObject;
  r: RabiSystem;
}

export type LossReason = 'time' | 'wrong-colour' | 'escaped';

/** Phases of the 'zone-after-dark' level. */
export type ZonePhase = 'look' | 'dark' | 'done';

/** Focus 0 = wide and blurry, 1 = narrow and sharp (PLAN.md §2.1, #3). */
export const FOCUS = {
  /** Cone half-angle at focus 0 and 1. */
  wideAngle: (45 * Math.PI) / 180,
  narrowAngle: (15 * Math.PI) / 180,
  /** View range in cells on levels with focus: wide enough to take in a whole atom cloud. */
  range: 8,
  /** Resolution of one photon at focus 0, cells (a blurry look). */
  maxBlur: 10,
  /** Photons per second caught by a blurry look. */
  photonRate: 2,
  /** Width of the soft edge of a blurry look, cells. */
  softEdge: 1.5,
  /** At this focus and above the look is sharp: an instant collapse every frame. */
  sharpFrom: 0.95,
  initial: 0.5,
} as const;

export type SimEvent =
  | { type: 'collapsed'; body: number; site: number }
  /** A ball of the pair got a new definite colour (side 1 may change without being seen). */
  | { type: 'qubit-changed'; side: 0 | 1 }
  | { type: 'plate'; plate: MapObject; lockOutcome: Outcome }
  /** A lamp or flower got a new definite state, or a blurry atom was sighted. */
  | { type: 'flash'; col: number; row: number }
  | { type: 'lights-out' }
  | { type: 'next-round' }
  | { type: 'detector'; col: number; row: number; inZone: boolean }
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
  readonly lamps: Lamp[];
  readonly flowers: Flower[];
  readonly zone: MapObject[];
  player: Vec2;
  glasses: Basis = 'Z';
  /** 0 = wide and blurry, 1 = narrow and sharp. Only levels with `focus` use it. */
  focus: number = FOCUS.initial;
  /** 'zone-after-dark': current phase, seconds the atom has been watched, dark time left. */
  phase: ZonePhase = 'look';
  watched = 0;
  darkLeft = 0;
  /** Rounds already survived in the ring. */
  roundsDone = 0;
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
    // Lamps start "both on and off": certain in X, a coin toss in Z.
    this.lamps = this.map.objects
      .filter((o) => o.role === 'lamp')
      .map((def) => ({ def, q: new Qubit(X_ANGLE) }));
    // A flower opens fully in 4 s if nobody watches it.
    this.flowers = this.map.objects
      .filter((o) => o.role === 'flower')
      .map((def) => ({ def, r: new RabiSystem(Math.PI / 8) }));
    this.zone = this.map.objects.filter((o) => o.role === 'zone' || o.char === 'A');
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
        if (def.spread) psi.setGaussian({ x: def.col, y: def.row }, def.spread);
        return {
          def,
          psi,
          seen: new Array<boolean>(lattice.size).fill(false),
        };
      });
  }

  get timeLeft(): number | null {
    return this.level.timeLimit === undefined
      ? null
      : Math.max(0, this.level.timeLimit - this.time);
  }

  solid = (c: number, r: number): boolean => isSolid(this.map, c, r);
  opaque = (c: number, r: number): boolean => blocksSight(this.map, c, r);

  /** Cone half-angle for the current focus. */
  get halfAngle(): number {
    if (!this.level.focus) return GAZE.halfAngle;
    return FOCUS.wideAngle + (FOCUS.narrowAngle - FOCUS.wideAngle) * this.focus;
  }

  get range(): number {
    return this.level.focus ? FOCUS.range : GAZE.range;
  }

  /** Resolution of one photon in cells, or 0 for a sharp look (collapse every frame). */
  get blur(): number {
    if (!this.level.focus || this.focus >= FOCUS.sharpFrom) return 0;
    return FOCUS.maxBlur * (1 - this.focus);
  }

  setFocus(value: number): void {
    if (this.level.focus) this.focus = Math.min(1, Math.max(0, value));
  }

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

    if (this.phase === 'dark') gaze = null; // lights out: nothing to see
    this.cone =
      gaze === null
        ? null
        : {
            origin: this.player,
            angle: Math.atan2(gaze.y - this.player.y, gaze.x - this.player.x),
            range: this.range,
            halfAngle: this.halfAngle,
          };

    let won = false;
    this.bodies.forEach((body, index) => {
      body.psi.evolve(dt);
      const { lattice } = body.psi;
      for (let i = 0; i < lattice.size; i++) {
        body.seen[i] = this.sees(lattice.col[i]!, lattice.row[i]!);
      }
      const wasDefinite = body.psi.definiteSite() >= 0;
      const blur = this.blur;
      let out;
      if (blur === 0) {
        out = body.psi.measure(body.seen, this.rng);
      } else {
        // A blurry look catches a few photons per second, each a rough reading.
        // Cells with no amplitude cannot be seen there; skip their ray-marching.
        const vis = Array.from(lattice.col, (c, i) =>
          this.cone && body.psi.probability(i) > 1e-9
            ? cellVisibility(this.cone, c, lattice.row[i]!, this.opaque, FOCUS.softEdge)
            : 0,
        );
        let inView = 0;
        for (let i = 0; i < lattice.size; i++) inView += vis[i]! * body.psi.probability(i);
        out = body.psi.measureSoft(vis, FOCUS.photonRate * dt, blur, this.rng);
        // "Watched" means the atom is mostly inside the view.
        if (out.kind !== 'found' && inView >= 0.5) out = { kind: 'watched' as const };
      }
      const seenNow = out.kind === 'found' || out.kind === 'watched';
      if (!seenNow) return;
      if (this.level.winCondition.type === 'zone-after-dark' && this.phase === 'look') {
        this.watched += dt;
      }
      if (out.kind !== 'found') return;
      // A sharp look flashes when it collapses a cloud; a blurry one on every photon.
      if (blur > 0 || !wasDefinite) events.push({ type: 'collapsed', body: index, site: out.site });
      const col = lattice.col[out.site];
      const row = lattice.row[out.site];
      if (this.targets.some((t) => t.col === col && t.row === row)) won = true;
    });
    if (this.level.detectorRate) won ||= this.autoDetect(dt, events);

    this.observeQubits(events);
    this.observeLampsAndFlowers(dt, events);
    if (this.level.winCondition.type === 'zone-after-dark') {
      const result = this.zoneStep(dt, events);
      if (result === 'won') won = true;
      else if (result === 'lost') return this.lose(events, 'escaped');
    }

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

  /** Lamps in view are measured through the glasses; flowers bloom unless watched. */
  private observeLampsAndFlowers(dt: number, events: SimEvent[]): void {
    for (const lamp of this.lamps) {
      if (!this.sees(lamp.def.col, lamp.def.row)) continue;
      const before = lamp.q.angle;
      lamp.q.measure(BASIS_ANGLE[this.glasses], this.rng);
      if (Math.abs(before - lamp.q.angle) > 1e-9) {
        events.push({ type: 'flash', col: lamp.def.col, row: lamp.def.row });
      }
    }
    for (const flower of this.flowers) {
      flower.r.evolve(dt);
      if (!this.sees(flower.def.col, flower.def.row)) continue;
      const before = flower.r.angle;
      flower.r.measure(this.rng);
      // Only a real jump flashes, not the tiny reset of a watched bud.
      if (Math.abs(before - flower.r.angle) > 0.05) {
        events.push({ type: 'flash', col: flower.def.col, row: flower.def.row });
      }
    }
  }

  /**
   * Automatic detectors on the target cells: an imperfect counter that
   * clicks at a finite rate (a perfect one, watching every instant, would
   * Zeno-freeze the atom away).
   */
  private autoDetect(dt: number, events: SimEvent[]): boolean {
    const rate = this.level.detectorRate ?? 0;
    let hit = false;
    this.bodies.forEach((body, index) => {
      const { lattice } = body.psi;
      const w = Array.from(lattice.col, (c, i) =>
        this.targets.some((t) => t.col === c && t.row === lattice.row[i]) ? 1 : 0,
      );
      const out = body.psi.measureSoft(w, rate * dt, 0, this.rng);
      if (out.kind === 'found') {
        events.push({ type: 'collapsed', body: index, site: out.site });
        hit = true;
      }
    });
    return hit;
  }

  /** 'zone-after-dark': watch long enough → lights out → detector check. */
  private zoneStep(dt: number, events: SimEvent[]): 'won' | 'lost' | null {
    const cond = this.level.winCondition;
    if (cond.type !== 'zone-after-dark') return null;
    if (this.phase === 'look' && this.watched >= cond.look) {
      this.phase = 'dark';
      this.darkLeft = cond.dark;
      events.push({ type: 'lights-out' });
      return null;
    }
    if (this.phase !== 'dark') return null;
    this.darkLeft -= dt;
    if (this.darkLeft > 0) return null;
    this.phase = 'done';
    // The detector takes one sharp look at the atom.
    const body = this.bodies[0];
    if (!body) return 'lost';
    const site = pickWeighted(this.rng, Array.from(body.psi.probabilities()));
    body.psi.collapseTo(site);
    const col = body.psi.lattice.col[site]!;
    const row = body.psi.lattice.row[site]!;
    const inZone = this.zone.some((z) => z.col === col && z.row === row);
    events.push({ type: 'detector', col, row, inZone });
    if (!inZone) return 'lost';
    this.roundsDone++;
    if (this.roundsDone >= cond.rounds) return 'won';
    // Next round: a fresh, calm atom in the same place.
    const def = body.def;
    body.psi.setGaussian({ x: def.col, y: def.row }, def.spread ?? 1);
    this.phase = 'look';
    this.watched = 0;
    events.push({ type: 'next-round' });
    return null;
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
