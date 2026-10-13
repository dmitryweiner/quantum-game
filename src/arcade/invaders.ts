import { floodLattice, type Lattice } from '../quantum/lattice';
import type { Rng } from '../quantum/rng';
import { Superposition } from '../quantum/superposition';
import type { QuantumBody } from '../game/systems/LevelSim';
import { ClassicalTwin, SHOCK, spreadMultiplier, type Paradox } from './paradox';

/** Tunable numbers of Quantum Invaders (PLAN-IMPROVEMENTS.md §3). */
export const INVADERS = {
  cols: 11,
  rows: 21,
  /** The two-slit shield: its row and the open cells in it. */
  shieldRow: 11,
  slits: [2, 3, 7, 8] as readonly number[],
  /** The formation: columns × rows of slots, their spacing, the first row. */
  formationCols: 4,
  formationRows: 3,
  spacingX: 2,
  spacingY: 2,
  startRow: 1,
  /**
   * Game rule, not physics: each invader is a wave in a trap of ±trapX × ±trapY
   * cells around its slot, and the trap marches with the formation. Inside the
   * trap the wave spreads, collapses and freezes honestly.
   */
  trapX: 2,
  trapY: 1,
  /** Hopping rate of an invader inside its trap (1/s). */
  hop: 0.7,
  /** Seconds per formation step at the start of wave 1, and the fastest. */
  stepStart: 1.5,
  stepMin: 0.3,
  /** Each wave makes the formation this much faster (multiplier). */
  waveSpeedUp: 0.85,
  /** The ship: speed (cells/s), lives, laser speed and cooldown. */
  shipSpeed: 7,
  lives: 3,
  laserSpeed: 20,
  fireCooldown: 0.35,
  /** The searchlight widens by this many cells per row of distance. */
  lightSpread: 0.03,
  /** Bombs: mean seconds between drops, at most this many in flight. */
  bombEvery: 1.3,
  maxBombs: 3,
  /** Bomb wave packet: hopping rate, width (cells), downward wave number (rad/cell). */
  bombHop: 3,
  bombWidth: 2,
  bombK: 1.6,
  bombLife: 7,
  /**
   * How often a look (the searchlight, the slit cameras) catches a bomb in
   * view, per second. Finite, so a look is a which-path detector rather than
   * a wall: watched every instant, a bomb could not pass a slit at all (Zeno).
   */
  bombLookRate: 12,
  /**
   * How often the ground (and space above the formation) catches a bomb
   * that is there, per second. About twice the hopping rate absorbs a wave
   * cleanly; a detector that clicked every frame would reflect it instead
   * (a Zeno mirror) and behave differently at 60 and 120 frames per second.
   */
  bombCatchRate: 6,
  /** Quantum torpedoes (as in the old starships). */
  torpedoes: 3,
  maxTorpedoes: 5,
  torpedoHop: 3,
  torpedoWidth: 0.9,
  torpedoK: Math.PI / 2,
  torpedoLife: 4,
  torpedoContact: 14,
  /** The UFO: seconds between visits, speed, distance between its two places. */
  ufoEvery: 18,
  ufoSpeed: 1.6,
  ufoGap: 4,
  ufoPoints: 5,
  /** Entangled pairs in a wave: 1 in wave 1, one more every other wave. */
  pairs: 1,
  /** An invader found this far from its slot is named (the trap is small). */
  farCells: 2,
} as const;

export interface Slot {
  /** Index in the formation (column, row). */
  fc: number;
  fr: number;
}

export interface Invader extends QuantumBody {
  id: number;
  slot: Slot;
  /** Id of its entangled twin, while the pair has not been measured yet. */
  twin: number | null;
  /** Seconds held still by the searchlight (Zeno). */
  watched: number;
}

export interface Bomb extends QuantumBody {
  id: number;
  age: number;
}

export interface Torpedo extends QuantumBody {
  id: number;
  age: number;
}

/** The UFO: in a superposition of two places on the top row, until a laser asks. */
export interface Ufo {
  x: number;
  dir: 1 | -1;
  branches: { dx: number; p: number }[];
}

export interface Laser {
  col: number;
  y: number;
}

export type InvaderEvent =
  | { type: 'collapsed'; invader: number; site: number }
  | { type: 'fired' }
  | { type: 'hit'; invader: number; col: number; row: number; points: number }
  | { type: 'miss'; col: number; row: number }
  | { type: 'bomb'; bomb: number }
  /** A bomb met the shield (or a side wall) and is gone. */
  | { type: 'fizzle'; bomb: number; col: number; row: number }
  /** A bomb reached the ground: on the ship (`ship`) or beside it. */
  | { type: 'landed'; bomb: number; col: number; ship: boolean }
  | { type: 'torpedo'; torpedo: number }
  | { type: 'torpedo-hit'; torpedo: number; invader: number; col: number; row: number }
  | { type: 'torpedo-gone'; torpedo: number }
  | { type: 'ufo' }
  | { type: 'ufo-hit'; col: number; points: number }
  | { type: 'ufo-miss'; col: number }
  | { type: 'step' }
  | { type: 'wave'; wave: number }
  | {
      type: 'paradox';
      paradox: Paradox;
      col: number;
      row: number;
      from: { col: number; row: number };
    }
  | { type: 'over'; reason: 'lives' | 'landed' };

/** What the player does this frame. */
export interface InvadersInput {
  /** -1, 0 or 1. */
  move: number;
  /** The searchlight is on (eyes open). */
  look: boolean;
  fire: boolean;
}

/**
 * Quantum Invaders, engine-free (PLAN-IMPROVEMENTS.md §3). The formation
 * marches classically; each invader is a wave in a trap around its slot —
 * it spreads while unseen, the searchlight collapses it and keeps it still
 * (Zeno), a laser asks every cell it crosses. Bombs are wave packets: the
 * shield stops them except at two slits, and what gets through falls in
 * stripes — unless the light looks at the slits.
 */
export class InvadersGame {
  readonly cols = INVADERS.cols;
  readonly rows = INVADERS.rows;
  readonly shipRow = INVADERS.rows - 1;
  /** Ship centre, in cells (x of the cell centre). */
  shipX = Math.floor(INVADERS.cols / 2) + 0.5;
  invaders: Invader[] = [];
  bombs: Bomb[] = [];
  torpedoes: Torpedo[] = [];
  lasers: Laser[] = [];
  ufo: Ufo | null = null;
  /** Formation origin (column, row of slot 0,0) and marching direction. */
  origin: { col: number; row: number } = { col: 1, row: INVADERS.startRow };
  dir: 1 | -1 = 1;
  lives: number = INVADERS.lives;
  torpedoAmmo: number = INVADERS.torpedoes;
  score = 0;
  wave = 1;
  over = false;
  look = false;
  /** 📷 Cameras on the slits: every bomb is asked which slit it takes. */
  cameras = false;
  /** Classical physics (S4): invaders sit in their slots, bombs fall straight. */
  classical = false;
  private stepAcc = 0;
  private bombIn = 2;
  private ufoIn: number = INVADERS.ufoEvery;
  private cooldown = 0;
  private nextId = 0;
  /** The bomb lattice: the whole field (shared by all bombs and torpedoes). */
  /** Where a bomb can be: everything but the shield and the walls (which reflect it). */
  private readonly field: Lattice;
  /** Where a torpedo can be: everywhere (the shield stops only alien matter). */
  private readonly open: Lattice;
  /** The top row: a bomb bounced off the shield flies away into space there. */
  private readonly spaceMask: number[];
  private readonly groundMask: number[];

  constructor(private readonly rng: Rng) {
    this.field = floodLattice(
      { col: 0, row: 0 },
      (c, r) => this.inField(c, r) && !this.isWall(c, r),
    );
    this.open = floodLattice({ col: 0, row: 0 }, (c, r) => this.inField(c, r));
    const n = this.field.size;
    this.spaceMask = new Array<number>(n).fill(0);
    this.groundMask = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      const r = this.field.row[i]!;
      if (r === 0) this.spaceMask[i] = 1;
      else if (r === this.shipRow) this.groundMask[i] = 1;
    }
    this.newWave();
  }

  inField = (c: number, r: number): boolean => c >= 0 && c < this.cols && r >= 0 && r < this.rows;

  /** The shield (except its slits) and the side walls below it: bombs bounce off them. */
  isWall(c: number, r: number): boolean {
    const S = INVADERS.shieldRow;
    if (r === S) return !INVADERS.slits.includes(c);
    return r > S && (c === 0 || c === this.cols - 1);
  }

  get shipCol(): number {
    return Math.floor(this.shipX);
  }

  /** Seconds per formation step: faster with each wave and as invaders fall. */
  get stepTime(): number {
    const total = INVADERS.formationCols * INVADERS.formationRows;
    const base = INVADERS.stepStart * INVADERS.waveSpeedUp ** (this.wave - 1);
    return Math.max(INVADERS.stepMin, base * (0.35 + (0.65 * this.invaders.length) / total));
  }

  slotCell(s: Slot): { col: number; row: number } {
    return {
      col: this.origin.col + s.fc * INVADERS.spacingX,
      row: this.origin.row + s.fr * INVADERS.spacingY,
    };
  }

  /** The classical place of an invader: its slot (S1). */
  twinOf(inv: Invader): ClassicalTwin {
    const c = this.slotCell(inv.slot);
    return new ClassicalTwin(c.col, c.row);
  }

  private trapOpen(center: { col: number; row: number }) {
    return (c: number, r: number) =>
      Math.abs(c - center.col) <= INVADERS.trapX &&
      Math.abs(r - center.row) <= INVADERS.trapY &&
      this.inField(c, r) &&
      r < INVADERS.shieldRow;
  }

  private newWave(): void {
    this.origin = { col: 1, row: INVADERS.startRow };
    this.dir = 1;
    this.invaders = [];
    for (let fr = 0; fr < INVADERS.formationRows; fr++) {
      for (let fc = 0; fc < INVADERS.formationCols; fc++) {
        const slot = { fc, fr };
        const at = this.slotCell(slot);
        const lattice = floodLattice(at, this.trapOpen(at));
        this.invaders.push({
          id: this.nextId++,
          slot,
          twin: null,
          watched: 0,
          def: { char: 'I', role: 'quantum', emoji: '👾', col: at.col, row: at.row },
          psi: new Superposition(lattice, lattice.siteAt(at.col, at.row), INVADERS.hop),
          seen: new Array<boolean>(lattice.size).fill(false),
        });
      }
    }
    // Entangled pairs: mirror images in the same formation row.
    const pairs = Math.min(
      INVADERS.formationRows,
      INVADERS.pairs + Math.floor((this.wave - 1) / 2),
    );
    for (let k = 0; k < pairs; k++) {
      const fr = k % INVADERS.formationRows;
      const a = this.invaders.find((i) => i.slot.fr === fr && i.slot.fc === 0)!;
      const b = this.invaders.find(
        (i) => i.slot.fr === fr && i.slot.fc === INVADERS.formationCols - 1,
      )!;
      a.twin = b.id;
      b.twin = a.id;
      a.def = { ...a.def, emoji: '👽' };
      b.def = { ...b.def, emoji: '👽' };
    }
    this.stepAcc = 0;
  }

  byId(id: number): Invader | undefined {
    return this.invaders.find((i) => i.id === id);
  }

  /** The twin cell of `cell` of invader `a` in invader `b`'s trap: mirrored left–right. */
  private mirrorCell(a: Invader, b: Invader, col: number, row: number) {
    const sa = this.slotCell(a.slot);
    const sb = this.slotCell(b.slot);
    return { col: sb.col - (col - sa.col), row: sb.row + (row - sa.row) };
  }

  /**
   * Game rule, not physics: while a pair is unmeasured, the twin's cloud is
   * the mirror image of the leader's (the pair hops together). What is
   * physics: the correlation, and that measuring either one settles both.
   */
  private syncTwin(a: Invader): void {
    const b = a.twin !== null ? this.byId(a.twin) : undefined;
    if (!b || a.id > b.id) return;
    b.psi.re.fill(0);
    b.psi.im.fill(0);
    const la = a.psi.lattice;
    for (let i = 0; i < la.size; i++) {
      const m = this.mirrorCell(a, b, la.col[i]!, la.row[i]!);
      const j = b.psi.lattice.siteAt(m.col, m.row);
      if (j < 0) continue;
      b.psi.re[j] = a.psi.re[i]!;
      b.psi.im[j] = a.psi.im[i]!;
    }
    b.psi.evolve(0);
  }

  /** The leader of a pair (lower id) and its twin, or the invader alone. */
  private pairOf(inv: Invader): [Invader, Invader | null] {
    const t = inv.twin !== null ? this.byId(inv.twin) : undefined;
    if (!t) return [inv, null];
    return inv.id < t.id ? [inv, t] : [t, inv];
  }

  /**
   * Asks a pair (or a lone invader) "are you in these cells?" — `cellsA` of
   * the leader, `cellsB` of the twin. A "yes" settles both; the pair is then
   * no longer entangled.
   */
  private measurePair(
    a: Invader,
    b: Invader | null,
    seenA: (c: number, r: number) => boolean,
    seenB: (c: number, r: number) => boolean,
    events: InvaderEvent[],
    before = a.psi.definiteSite(),
  ): { found: Invader | null; site: number; chance: number } {
    const la = a.psi.lattice;
    const mask = new Array<boolean>(la.size).fill(false);
    let chance = 0;
    for (let i = 0; i < la.size; i++) {
      const c = la.col[i]!;
      const r = la.row[i]!;
      let seen = seenA(c, r);
      if (!seen && b) {
        const m = this.mirrorCell(a, b, c, r);
        seen = b.psi.lattice.siteAt(m.col, m.row) >= 0 && seenB(m.col, m.row);
      }
      mask[i] = seen;
      if (seen) chance += a.psi.probability(i);
    }
    const out = a.psi.measure(mask, this.rng);
    if (out.kind !== 'found') {
      if (b) this.syncTwin(a);
      return { found: null, site: -1, chance };
    }
    const c = la.col[out.site]!;
    const r = la.row[out.site]!;
    if (before < 0) {
      events.push({ type: 'collapsed', invader: a.id, site: out.site });
      this.nameFar(a, c, r, events);
    }
    if (!b) return { found: seenA(c, r) ? a : null, site: out.site, chance };
    const j = this.settleTwin(a, b, out.site, before < 0, events);
    const m = this.mirrorCell(a, b, c, r);
    if (seenA(c, r)) return { found: a, site: out.site, chance };
    if (j >= 0 && seenB(m.col, m.row)) return { found: b, site: j, chance };
    return { found: null, site: -1, chance };
  }

  /**
   * The leader of a pair is now definite at `site`: its twin settles at the
   * mirror cell at once, however far away, and the pair is no longer
   * entangled. Returns the twin's site (-1 if the mirror cell is outside its trap).
   */
  private settleTwin(
    a: Invader,
    b: Invader,
    site: number,
    named: boolean,
    events: InvaderEvent[],
  ): number {
    a.psi.collapseTo(site);
    const c = a.psi.lattice.col[site]!;
    const r = a.psi.lattice.row[site]!;
    const m = this.mirrorCell(a, b, c, r);
    const j = b.psi.lattice.siteAt(m.col, m.row);
    a.twin = b.twin = null;
    if (j < 0) return j;
    b.psi.collapseTo(j);
    events.push({ type: 'collapsed', invader: b.id, site: j });
    if (named)
      events.push({
        type: 'paradox',
        paradox: { kind: 'spooky', value: Math.round(Math.hypot(m.col - c, m.row - r)) },
        col: m.col,
        row: m.row,
        from: { col: c, row: r },
      });
    return j;
  }

  private nameFar(inv: Invader, col: number, row: number, events: InvaderEvent[]): void {
    const slot = this.slotCell(inv.slot);
    const d = Math.round(Math.hypot(col - slot.col, row - slot.row));
    if (d >= INVADERS.farCells)
      events.push({ type: 'paradox', paradox: { kind: 'far', value: d }, col, row, from: slot });
  }

  /** Is cell (c, r) in the searchlight? A narrow beam straight up from the ship. */
  lit(c: number, r: number): boolean {
    if (!this.look || r >= this.shipRow) return false;
    const half = 0.5 + INVADERS.lightSpread * (this.shipRow - r);
    return Math.abs(c + 0.5 - this.shipX) <= half;
  }

  update(dt: number, input: InvadersInput): InvaderEvent[] {
    const events: InvaderEvent[] = [];
    if (this.over) return events;
    this.look = input.look;
    this.shipX = Math.min(
      this.cols - 1.5,
      Math.max(1.5, this.shipX + input.move * INVADERS.shipSpeed * dt),
    );

    this.march(dt, events);
    if (this.over) return events;
    this.watchInvaders(dt, events);
    this.dropBombs(dt, events);
    this.moveBombs(dt, events);
    if (this.over) return events;
    this.moveUfo(dt, events);

    this.cooldown -= dt;
    if (input.fire && this.cooldown <= 0) {
      this.cooldown = INVADERS.fireCooldown;
      this.lasers.push({ col: this.shipCol, y: this.shipRow });
      events.push({ type: 'fired' });
    }
    this.moveLasers(dt, events);
    this.moveTorpedoes(dt, events);

    if (this.invaders.length === 0) {
      this.wave++;
      this.torpedoAmmo = Math.min(INVADERS.maxTorpedoes, this.torpedoAmmo + 1);
      this.bombs = [];
      this.newWave();
      events.push({ type: 'wave', wave: this.wave });
    }
    return events;
  }

  /** The formation steps sideways, and down a row at the edge. Traps move with it. */
  private march(dt: number, events: InvaderEvent[]): void {
    this.stepAcc += dt;
    if (this.stepAcc < this.stepTime || this.invaders.length === 0) return;
    this.stepAcc = 0;
    const cols = this.invaders.map((i) => this.slotCell(i.slot).col);
    const min = Math.min(...cols);
    const max = Math.max(...cols);
    let dc: number = this.dir;
    let dr = 0;
    // Slots stay within the ship's reach (columns 1 … cols − 2).
    if ((this.dir > 0 && max + 1 > this.cols - 2) || (this.dir < 0 && min - 1 < 1)) {
      dc = 0;
      dr = 1;
      this.dir = this.dir > 0 ? -1 : 1;
    }
    this.origin = { col: this.origin.col + dc, row: this.origin.row + dr };
    for (const inv of this.invaders) this.moveTrap(inv, dc, dr);
    for (const inv of this.invaders) this.syncTwin(inv);
    events.push({ type: 'step' });
    const bottom = Math.max(...this.invaders.map((i) => this.slotCell(i.slot).row));
    if (bottom >= INVADERS.shieldRow - 1) {
      this.over = true;
      events.push({ type: 'over', reason: 'landed' });
    }
  }

  /** Carries an invader's wave along with its trap; what falls outside the field is lost. */
  private moveTrap(inv: Invader, dc: number, dr: number): void {
    const at = this.slotCell(inv.slot);
    const lattice = floodLattice(at, this.trapOpen(at));
    const psi = new Superposition(lattice, lattice.siteAt(at.col, at.row), INVADERS.hop);
    psi.re.fill(0);
    let kept = 0;
    const old = inv.psi.lattice;
    for (let i = 0; i < old.size; i++) {
      const j = lattice.siteAt(old.col[i]! + dc, old.row[i]! + dr);
      if (j < 0) continue;
      psi.re[j] = inv.psi.re[i]!;
      psi.im[j] = inv.psi.im[i]!;
      kept += inv.psi.probability(i);
    }
    if (kept < 1e-9) psi.collapseTo(lattice.siteAt(at.col, at.row));
    else psi.evolve(0);
    inv.psi = psi;
    inv.seen = new Array<boolean>(lattice.size).fill(false);
  }

  /** Unseen invaders spread; the searchlight measures them every frame. */
  private watchInvaders(dt: number, events: InvaderEvent[]): void {
    for (const inv of this.invaders) {
      const [a, b] = this.pairOf(inv);
      if (a !== inv) continue;
      // Definite before this frame's spreading: then a find in the same cell is a Zeno hold.
      const before = a.psi.definiteSite();
      if (!this.classical) {
        a.psi.evolve(dt);
        if (b) this.syncTwin(a);
      }
      const res = this.measurePair(a, b, this.lit.bind(this), this.lit.bind(this), events, before);
      for (const x of b ? [a, b] : [a]) {
        const { lattice } = x.psi;
        for (let i = 0; i < lattice.size; i++)
          x.seen[i] = this.lit(lattice.col[i]!, lattice.row[i]!);
      }
      // Held still by the look (Zeno): named once per invader.
      if (res.found && before >= 0 && before === a.psi.definiteSite()) {
        a.watched += dt;
        if (a.watched >= SHOCK.zenoSeconds && a.watched - dt < SHOCK.zenoSeconds) {
          const c = a.psi.lattice.col[before]!;
          const r = a.psi.lattice.row[before]!;
          events.push({
            type: 'paradox',
            paradox: { kind: 'zeno', value: SHOCK.zenoSeconds },
            col: c,
            row: r,
            from: { col: c, row: r },
          });
        }
      } else a.watched = 0;
    }
  }

  /** The lowest invader of a random formation column drops a bomb now and then. */
  private dropBombs(dt: number, events: InvaderEvent[]): void {
    this.bombIn -= dt;
    if (this.bombIn > 0 || this.bombs.length >= INVADERS.maxBombs || !this.invaders.length) return;
    this.bombIn = INVADERS.bombEvery * (0.5 + this.rng.next());
    const fcs = [...new Set(this.invaders.map((i) => i.slot.fc))];
    const fc = fcs[Math.floor(this.rng.next() * fcs.length)]!;
    const from = this.invaders
      .filter((i) => i.slot.fc === fc)
      .reduce((a, b) => (b.slot.fr > a.slot.fr ? b : a));
    // Game rule: a bomb dropped by a cloud is a packet around the cloud's middle.
    const { x, y } = from.psi.stats();
    const psi = new Superposition(this.field, 0, INVADERS.bombHop);
    const start = { x: Math.round(x), y: Math.round(y) + 1 };
    if (this.classical) psi.collapseTo(this.field.siteAt(start.x, start.y));
    else psi.setWavePacket(start, INVADERS.bombWidth, { x: 0, y: INVADERS.bombK });
    const id = this.nextId++;
    this.bombs.push({
      id,
      age: 0,
      def: { char: 'B', role: 'quantum', emoji: '💣', col: start.x, row: start.y },
      psi,
      seen: new Array<boolean>(this.field.size).fill(false),
    });
    events.push({ type: 'bomb', bomb: id });
  }

  /**
   * Bombs fly on as waves. The searchlight measures them; the shield and the
   * side walls are detectors (a bomb found there is gone); the ground is a
   * detector too — a bomb found under the ship hits it.
   */
  private moveBombs(dt: number, events: InvaderEvent[]): void {
    const keep: Bomb[] = [];
    for (const b of this.bombs) {
      b.age += dt;
      if (this.classical) {
        const hit = this.fallClassically(b, dt);
        if (hit) {
          events.push({ type: 'fizzle', bomb: b.id, ...hit });
          continue;
        }
      } else b.psi.evolve(dt);
      const { lattice } = b.psi;
      const view = new Array<number>(lattice.size).fill(0);
      for (let i = 0; i < lattice.size; i++) {
        const c = lattice.col[i]!;
        const r = lattice.row[i]!;
        b.seen[i] =
          this.lit(c, r) ||
          (this.cameras && r === INVADERS.shieldRow && INVADERS.slits.includes(c));
        view[i] = b.seen[i] ? 1 : 0;
      }
      b.psi.measureSoft(view, Math.min(1, INVADERS.bombLookRate * dt), 0, this.rng);
      const catchP = Math.min(1, INVADERS.bombCatchRate * dt);
      const wall = b.psi.measureSoft(this.spaceMask, catchP, 0, this.rng);
      if (wall.kind === 'found') {
        events.push({
          type: 'fizzle',
          bomb: b.id,
          col: lattice.col[wall.site]!,
          row: lattice.row[wall.site]!,
        });
        continue;
      }
      const ground = b.psi.measureSoft(this.groundMask, catchP, 0, this.rng);
      if (ground.kind === 'found') {
        const col = lattice.col[ground.site]!;
        const ship = col === this.shipCol;
        events.push({ type: 'landed', bomb: b.id, col, ship });
        if (!ship && col >= 4 && col <= 6)
          events.push({
            type: 'paradox',
            paradox: { kind: 'interference', value: col },
            col,
            row: this.shipRow,
            from: { col, row: INVADERS.shieldRow },
          });
        if (ship) {
          this.lives--;
          if (this.lives <= 0) {
            this.over = true;
            events.push({ type: 'over', reason: 'lives' });
            return;
          }
        }
        continue;
      }
      if (b.age < INVADERS.bombLife) keep.push(b);
    }
    this.bombs = keep;
  }

  /** Classical mode: a bomb is a point falling straight down; returns the wall cell it hit, if any. */
  private fallClassically(b: Bomb, dt: number): { col: number; row: number } | null {
    const site = b.psi.definiteSite();
    if (site < 0) return null;
    const speed = 2 * INVADERS.bombHop * Math.sin(INVADERS.bombK);
    const rowsBefore = Math.floor((b.age - dt) * speed);
    const rowsNow = Math.floor(b.age * speed);
    if (rowsNow > rowsBefore) {
      const c = b.psi.lattice.col[site]!;
      const r = Math.min(this.rows - 1, b.psi.lattice.row[site]! + 1);
      const next = this.field.siteAt(c, r);
      if (next < 0) return { col: c, row: r };
      b.psi.collapseTo(next);
    }
    return null;
  }

  /** Lasers fly straight up; every new cell asks each invader (and the UFO) "are you here?". */
  private moveLasers(dt: number, events: InvaderEvent[]): void {
    const keep: Laser[] = [];
    for (const l of this.lasers) {
      const from = Math.floor(l.y);
      l.y -= INVADERS.laserSpeed * dt;
      let alive = l.y >= 0;
      for (let r = from - 1; r >= Math.max(0, Math.floor(l.y)) && alive; r--) {
        if (r === 0 && this.ufo) alive = !this.shootUfo(l.col, events);
        for (const inv of this.invaders) {
          if (!alive) break;
          const site = inv.psi.lattice.siteAt(l.col, r);
          if (site < 0 || inv.psi.probability(site) < 1e-9) continue;
          const spread = inv.psi.stats().spread;
          const [a, b] = this.pairOf(inv);
          const here = (c: number, rr: number) => c === l.col && rr === r;
          const res =
            a === inv
              ? this.measurePair(a, b, here, () => false, events)
              : this.measurePair(a, b, () => false, here, events);
          if (res.found) {
            this.kill(res.found, spread, l.col, r, events);
            alive = false;
          } else {
            events.push({ type: 'miss', col: l.col, row: r });
            if (res.chance >= SHOCK.negativeChance)
              events.push({
                type: 'paradox',
                paradox: { kind: 'negative', value: res.chance },
                col: l.col,
                row: r,
                from: this.slotCell(inv.slot),
              });
          }
        }
      }
      if (alive) keep.push(l);
    }
    this.lasers = keep;
  }

  private kill(inv: Invader, spread: number, col: number, row: number, events: InvaderEvent[]) {
    const points = spreadMultiplier(spread);
    this.score += points;
    this.invaders = this.invaders.filter((i) => i !== inv);
    for (const i of this.invaders) if (i.twin === inv.id) i.twin = null;
    events.push({ type: 'hit', invader: inv.id, col, row, points });
  }

  private moveUfo(dt: number, events: InvaderEvent[]): void {
    if (!this.ufo) {
      this.ufoIn -= dt;
      if (this.ufoIn > 0) return;
      this.ufoIn = INVADERS.ufoEvery;
      const dir = this.rng.next() < 0.5 ? 1 : -1;
      const p = this.classical ? 1 : [0.5, 0.7, 0.3][Math.floor(this.rng.next() * 3)]!;
      this.ufo = {
        x: dir > 0 ? -INVADERS.ufoGap : this.cols,
        dir,
        branches: this.classical
          ? [{ dx: 0, p: 1 }]
          : [
              { dx: 0, p },
              { dx: INVADERS.ufoGap, p: 1 - p },
            ],
      };
      events.push({ type: 'ufo' });
      return;
    }
    this.ufo.x += this.ufo.dir * INVADERS.ufoSpeed * dt;
    if (this.ufo.x > this.cols + 1 || this.ufo.x < -INVADERS.ufoGap - 1) this.ufo = null;
  }

  /** A laser reaching the top row at `col`: asks the UFO "are you here?" (Born rule). */
  private shootUfo(col: number, events: InvaderEvent[]): boolean {
    const u = this.ufo!;
    const i = u.branches.findIndex((b) => Math.floor(u.x + b.dx) === col);
    if (i < 0) return false;
    const b = u.branches[i]!;
    if (this.rng.next() < b.p) {
      this.score += INVADERS.ufoPoints;
      this.ufo = null;
      events.push({ type: 'ufo-hit', col, points: INVADERS.ufoPoints });
      if (b.p <= SHOCK.rareChance)
        events.push({
          type: 'paradox',
          paradox: { kind: 'rare', value: b.p },
          col,
          row: 0,
          from: { col, row: 0 },
        });
      return true;
    }
    // Not here: so it is certainly at the other place.
    u.branches = u.branches.filter((_, k) => k !== i).map((o) => ({ ...o, p: 1 }));
    events.push({ type: 'ufo-miss', col });
    return false;
  }

  /** Launch a quantum torpedo straight up: a wave packet that finds unseen invaders. */
  launchTorpedo(): InvaderEvent[] {
    if (this.over || this.torpedoAmmo <= 0) return [];
    const at = { x: this.shipCol, y: this.shipRow - 1 };
    const psi = new Superposition(this.open, 0, INVADERS.torpedoHop);
    psi.setWavePacket(at, INVADERS.torpedoWidth, { x: 0, y: -INVADERS.torpedoK });
    const id = this.nextId++;
    this.torpedoes.push({
      id,
      age: 0,
      def: { char: 'T', role: 'quantum', emoji: '⚛️', col: at.x, row: at.y },
      psi,
      seen: new Array<boolean>(this.open.size).fill(false),
    });
    this.torpedoAmmo--;
    return [{ type: 'torpedo', torpedo: id }];
  }

  /**
   * Where a torpedo cloud and an invader cloud overlap they may meet: the
   * chance grows with Σ p_torpedo·p_invader, the cell is picked by the Born rule.
   */
  private moveTorpedoes(dt: number, events: InvaderEvent[]): void {
    const keep: Torpedo[] = [];
    for (const t of this.torpedoes) {
      t.psi.evolve(dt);
      t.age += dt;
      let exploded = false;
      for (const inv of this.invaders) {
        const cells: number[] = [];
        const weights: number[] = [];
        let overlap = 0;
        const li = inv.psi.lattice;
        for (let j = 0; j < li.size; j++) {
          const i = this.open.siteAt(li.col[j]!, li.row[j]!);
          const w = t.psi.probability(i) * inv.psi.probability(j);
          if (w <= 0) continue;
          cells.push(j);
          weights.push(w);
          overlap += w;
        }
        if (
          overlap <= 0 ||
          this.rng.next() >= 1 - Math.exp(-INVADERS.torpedoContact * overlap * dt)
        )
          continue;
        let r = this.rng.next() * overlap;
        let pick = cells[0]!;
        for (let n = 0; n < cells.length; n++) {
          r -= weights[n]!;
          if (r < 0) {
            pick = cells[n]!;
            break;
          }
        }
        const col = li.col[pick]!;
        const row = li.row[pick]!;
        const spread = inv.psi.stats().spread;
        // The meeting is a measurement too: it settles a pair.
        const [a, b] = this.pairOf(inv);
        if (b) {
          const lead = a === inv ? { col, row } : this.mirrorCell(b, a, col, row);
          const site = a.psi.lattice.siteAt(lead.col, lead.row);
          if (site >= 0) this.settleTwin(a, b, site, true, events);
        } else inv.psi.collapseTo(pick);
        events.push({ type: 'torpedo-hit', torpedo: t.id, invader: inv.id, col, row });
        this.kill(inv, spread, col, row, events);
        exploded = true;
        break;
      }
      if (exploded) continue;
      if (t.age >= INVADERS.torpedoLife) {
        events.push({ type: 'torpedo-gone', torpedo: t.id });
        continue;
      }
      keep.push(t);
    }
    this.torpedoes = keep;
  }

  /** Switch classical physics on or off (S4): on, every invader sits in its slot. */
  setClassical(on: boolean): void {
    this.classical = on;
    if (!on) return;
    for (const inv of this.invaders) {
      const at = this.slotCell(inv.slot);
      inv.psi.collapseTo(inv.psi.lattice.siteAt(at.col, at.row));
      inv.twin = null;
    }
  }
}
