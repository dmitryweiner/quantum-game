import { blocksSight, isSolid, isWaveOpen, parseMap, type ParsedMap } from '../levels/map';
import { floodLattice } from '../quantum/lattice';
import type { Rng } from '../quantum/rng';
import { Superposition } from '../quantum/superposition';
import { cellSeen, type Cone } from '../game/systems/sight';
import type { QuantumBody } from '../game/systems/LevelSim';
import { ClassicalTwin, SHOCK, spreadMultiplier, type Paradox } from './paradox';

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

/** Fruits: how fast an unwatched one spreads (hopping rate γ, 1/s) and its bonus points. */
export const FRUITS = {
  /** Light: spreads fast, worth more. */
  cherry: { emoji: '🍒', hop: 1.2, bonus: 1 },
  apple: { emoji: '🍎', hop: 0.6, bonus: 0 },
  /** The apple's entangled twin. */
  green: { emoji: '🍏', hop: 0.6, bonus: 0 },
  /** Heavy: hardly spreads, cheap. */
  pear: { emoji: '🍐', hop: 0.25, bonus: 0 },
} as const;
export type FruitKind = keyof typeof FRUITS;

/** Tunable numbers of the quantum snake (PLAN.md §9.1, PLAN-IMPROVEMENTS.md §2). */
export const SNAKE = {
  /** Seconds per step at the start (calm), and the fastest it gets. */
  startTick: 0.45,
  minTick: 0.15,
  /** Each fruit — one more segment — makes a step this much shorter (multiplier). */
  speedUp: 0.95,
  /** The head's view: range in cells and half-angle. */
  viewRange: 4,
  viewHalfAngle: (30 * Math.PI) / 180,
  startLength: 3,
  /** Chances for the next fruits: an entangled 🍎🍏 pair, a cherry, a pear (else an apple). */
  pairChance: 0.3,
  cherryChance: 0.2,
  pearChance: 0.2,
  /** How often a hot cell notices a fruit on it (1/s): it keeps the fruit classical. */
  hotRate: 3,
} as const;

export interface Cell {
  col: number;
  row: number;
}

export interface Fruit extends QuantumBody {
  id: number;
  kind: FruitKind;
  /** Where it would be classically: where it was last seen (S1). */
  classical: ClassicalTwin;
  /** Id of its entangled twin, while the pair has not been measured. */
  partner: number | null;
  /** Seconds it has been held definite by the head's look (Zeno). */
  watched: number;
}

export type SnakeEvent =
  | { type: 'collapsed'; fruit: number; site: number }
  | { type: 'missed'; col: number; row: number }
  /** `points`: more for a fruit caught while still spread out (and for a cherry). */
  | { type: 'ate'; fruit: number; col: number; row: number; points: number }
  /** Something classically impossible, at (col, row); `from`: the classical place. */
  | { type: 'paradox'; paradox: Paradox; col: number; row: number; from: Cell }
  /** Stopped short of a wall (or itself): one more step that way and it crashes. */
  | { type: 'bump'; col: number; row: number }
  | { type: 'died' };

/**
 * Quantum snake, engine-free (PLAN.md §9.1). Fruits are quantum objects like
 * the sandbox cat: they spread while unwatched, the head's view cone
 * collapses them, a steady look freezes them (Zeno), and the head entering a
 * cell measures that cell. A 🍎🍏 pair is entangled: finding one settles the
 * other at the mirror cell. Hot cells 🔥 keep a fruit classical.
 */
export class SnakeGame {
  readonly map: ParsedMap;
  body: Cell[];
  dir: Dir = 'up';
  private queued: Dir[] = [];
  fruits: Fruit[] = [];
  tick: number = SNAKE.startTick;
  private acc = 0;
  score = 0;
  alive = true;
  cone: Cone | null = null;
  /** Classical physics (S4): fruits stay where they are, seen or not. */
  classical = false;
  /** The head looks ahead unless the player closes its eyes (🙈). */
  eyesOpen = true;
  private nextId = 0;
  private bumped = false;
  private readonly open: (c: number, r: number) => boolean;
  private readonly hot: Set<string>;

  constructor(
    arena: readonly string[],
    private readonly rng: Rng,
  ) {
    this.map = parseMap(arena);
    const s = this.map.playerStart;
    this.body = Array.from({ length: SNAKE.startLength }, (_, i) => ({
      col: s.col,
      row: s.row + i,
    }));
    this.open = (c, r) => isWaveOpen(this.map, c, r);
    this.hot = new Set(
      this.map.objects.filter((o) => o.role === 'hot').map((o) => `${o.col},${o.row}`),
    );
    this.spawnFruits();
    this.updateCone();
  }

  get head(): Cell {
    return this.body[0]!;
  }

  isHot(c: number, r: number): boolean {
    return this.hot.has(`${c},${r}`);
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

  private free(c: number, r: number): boolean {
    const far = Math.abs(c - this.head.col) + Math.abs(r - this.head.row) > 4;
    return !isSolid(this.map, c, r) && !this.occupied(c, r) && far;
  }

  /** The mirror cell (left–right) of a cell. */
  mirror(c: number, r: number): Cell {
    return { col: this.map.cols - 1 - c, row: r };
  }

  /** New fruits once the field is empty: an entangled pair, or one fruit. */
  private spawnFruits(): void {
    const cells: Cell[] = [];
    for (let r = 0; r < this.map.rows; r++)
      for (let c = 0; c < this.map.cols; c++) if (this.free(c, r)) cells.push({ col: c, row: r });
    const pick = (list: Cell[]) =>
      list[Math.floor(this.rng.next() * list.length)] ?? this.map.playerStart;
    const roll = this.rng.next();
    if (roll < SNAKE.pairChance) {
      // Left half, with a free mirror cell on the right.
      const left = cells.filter((c) => {
        const m = this.mirror(c.col, c.row);
        return c.col < m.col && this.free(m.col, m.row);
      });
      if (left.length) {
        const at = pick(left);
        const a = this.addFruit('apple', at);
        const b = this.addFruit('green', this.mirror(at.col, at.row));
        a.partner = b.id;
        b.partner = a.id;
        return;
      }
    }
    const kind: FruitKind =
      roll < SNAKE.pairChance + SNAKE.cherryChance
        ? 'cherry'
        : roll < SNAKE.pairChance + SNAKE.cherryChance + SNAKE.pearChance
          ? 'pear'
          : 'apple';
    this.addFruit(kind, pick(cells));
  }

  private addFruit(kind: FruitKind, at: Cell): Fruit {
    const lattice = floodLattice(at, this.open);
    const fruit: Fruit = {
      id: this.nextId++,
      kind,
      def: { char: 'a', role: 'quantum', emoji: FRUITS[kind].emoji, col: at.col, row: at.row },
      psi: new Superposition(lattice, lattice.siteAt(at.col, at.row), FRUITS[kind].hop),
      seen: new Array<boolean>(lattice.size).fill(false),
      classical: new ClassicalTwin(at.col, at.row),
      partner: null,
      watched: 0,
    };
    this.fruits.push(fruit);
    return fruit;
  }

  byId(id: number): Fruit | undefined {
    return this.fruits.find((f) => f.id === id);
  }

  /** Close or open the eyes: closed, the head measures only the cell it enters. */
  setEyes(open: boolean): void {
    this.eyesOpen = open;
    this.updateCone();
  }

  private updateCone(): void {
    if (!this.eyesOpen) {
      this.cone = null;
      return;
    }
    const h = this.head;
    this.cone = {
      origin: { x: h.col + 0.5, y: h.row + 0.5 },
      angle: DIR_ANGLE[this.dir],
      range: SNAKE.viewRange,
      halfAngle: SNAKE.viewHalfAngle,
    };
  }

  /** The leader of an entangled pair (the older one) and its twin, or the fruit alone. */
  private pairOf(f: Fruit): [Fruit, Fruit | null] {
    const t = f.partner !== null ? this.byId(f.partner) : undefined;
    if (!t) return [f, null];
    return f.id < t.id ? [f, t] : [t, f];
  }

  /**
   * Game rule, not physics: while a pair is unmeasured, the 🍏's cloud is the
   * mirror image of the 🍎's (they hop together). What is physics: the
   * correlation, and that finding either one settles both at once.
   */
  private syncTwin(a: Fruit, b: Fruit): void {
    b.psi.re.fill(0);
    b.psi.im.fill(0);
    const la = a.psi.lattice;
    for (let i = 0; i < la.size; i++) {
      const m = this.mirror(la.col[i]!, la.row[i]!);
      const j = b.psi.lattice.siteAt(m.col, m.row);
      if (j < 0) continue;
      b.psi.re[j] = a.psi.re[i]!;
      b.psi.im[j] = a.psi.im[i]!;
    }
    b.psi.evolve(0);
  }

  /**
   * Asks a fruit (or a pair) "are you in these cells?". The pair is asked as
   * one: a cell of the 🍏 counts as its mirror cell of the 🍎. Returns where
   * the asked fruit was found, or null.
   */
  private ask(
    f: Fruit,
    seen: (c: number, r: number) => boolean,
    events: SnakeEvent[],
    before = f.psi.definiteSite(),
  ): { fruit: Fruit; site: number } | null {
    const [a, b] = this.pairOf(f);
    const la = a.psi.lattice;
    const mask = new Array<boolean>(la.size).fill(false);
    for (let i = 0; i < la.size; i++) {
      const c = la.col[i]!;
      const r = la.row[i]!;
      const m = this.mirror(c, r);
      mask[i] = f === b ? seen(m.col, m.row) : seen(c, r);
    }
    const out = a.psi.measure(mask, this.rng);
    if (out.kind !== 'found') {
      if (b) this.syncTwin(a, b);
      return null;
    }
    const c = la.col[out.site]!;
    const r = la.row[out.site]!;
    if (before < 0) {
      events.push({ type: 'collapsed', fruit: a.id, site: out.site });
      this.nameFar(a, c, r, events);
    }
    a.classical.seen(c, r);
    if (!b) return { fruit: a, site: out.site };
    // Both settle at once, however far apart.
    const m = this.mirror(c, r);
    const j = b.psi.lattice.siteAt(m.col, m.row);
    a.partner = b.partner = null;
    // Which of the two is red was undecided too: the pair was 🍎🍏 or 🍏🍎 — now it is one of them.
    if (this.rng.next() < 0.5) {
      [a.kind, b.kind] = [b.kind, a.kind];
      a.def = { ...a.def, emoji: FRUITS[a.kind].emoji };
      b.def = { ...b.def, emoji: FRUITS[b.kind].emoji };
    }
    if (j >= 0) {
      b.psi.collapseTo(j);
      b.classical.seen(m.col, m.row);
      events.push({ type: 'collapsed', fruit: b.id, site: j });
      if (before < 0)
        events.push({
          type: 'paradox',
          paradox: { kind: 'spooky', value: Math.abs(m.col - c) },
          col: m.col,
          row: m.row,
          from: { col: c, row: r },
        });
    }
    if (f === b) return j >= 0 ? { fruit: b, site: j } : null;
    return { fruit: a, site: out.site };
  }

  /** Did the straight way from (c0, r0) to (c1, r1) cross a force field, along its rows? */
  private acrossField(c0: number, r0: number, c1: number, r1: number): boolean {
    if (r0 !== r1) return false;
    for (let c = Math.min(c0, c1) + 1; c < Math.max(c0, c1); c++)
      if (this.map.tiles[r0]?.[c] === 'barrier') return true;
    return false;
  }

  private nameFar(f: Fruit, col: number, row: number, events: SnakeEvent[]): void {
    const from = { col: f.classical.x, row: f.classical.y };
    if (this.acrossField(from.col, from.row, col, row)) {
      events.push({ type: 'paradox', paradox: { kind: 'tunnel', value: 1 }, col, row, from });
      return;
    }
    const far = f.classical.farFrom(col, row);
    if (far)
      events.push({
        type: 'paradox',
        paradox: far,
        col,
        row,
        from: { col: f.classical.x, row: f.classical.y },
      });
  }

  update(dt: number): SnakeEvent[] {
    const events: SnakeEvent[] = [];
    if (!this.alive) return events;

    // Fruits spread while unwatched; the head's view and hot cells measure them every frame.
    const sight = (c: number, r: number) =>
      this.cone !== null && cellSeen(this.cone, c, r, (cc, rr) => blocksSight(this.map, cc, rr));
    for (const f of [...this.fruits]) {
      const [a, b] = this.pairOf(f);
      if (a !== f || !this.fruits.includes(f)) continue;
      // Definite before this frame's spreading: then a find in the same cell is a Zeno hold.
      const before = a.psi.definiteSite();
      if (!this.classical) {
        a.psi.evolve(dt);
        if (b) this.syncTwin(a, b);
      }
      for (const x of b ? [a, b] : [a]) {
        const { lattice } = x.psi;
        for (let i = 0; i < lattice.size; i++) x.seen[i] = sight(lattice.col[i]!, lattice.row[i]!);
      }
      const seenA = (c: number, r: number) => sight(c, r);
      let res = this.ask(a, seenA, events, before);
      if (!res && b) res = this.ask(b, seenA, events, before);
      // Seen and still where it was: the look holds it (Zeno). Named once per fruit.
      if (res && res.fruit === a && before === res.site) {
        a.watched += dt;
        if (a.watched >= SHOCK.zenoSeconds && a.watched - dt < SHOCK.zenoSeconds) {
          const at = { col: a.classical.x, row: a.classical.y };
          events.push({
            type: 'paradox',
            paradox: { kind: 'zeno', value: SHOCK.zenoSeconds },
            ...at,
            from: at,
          });
        }
      } else a.watched = 0;
      // Hot cells: the environment notices a fruit on them now and then (decoherence).
      if (!this.classical) this.decohere(a, dt, events);
    }

    this.acc += dt;
    while (this.acc >= this.tick && this.alive) {
      this.acc -= this.tick;
      this.step(events);
    }
    return events;
  }

  private decohere(f: Fruit, dt: number, events: SnakeEvent[]): void {
    if (!this.hot.size) return;
    const { lattice } = f.psi;
    const w = new Array<number>(lattice.size);
    let any = false;
    for (let i = 0; i < lattice.size; i++) {
      w[i] = this.isHot(lattice.col[i]!, lattice.row[i]!) ? 1 : 0;
      if (w[i] && f.psi.probability(i) > 1e-9) any = true;
    }
    if (!any || f.partner !== null) return;
    const before = f.psi.definiteSite();
    const out = f.psi.measureSoft(w, Math.min(1, SNAKE.hotRate * dt), 0, this.rng);
    if (out.kind === 'found') {
      if (before < 0) events.push({ type: 'collapsed', fruit: f.id, site: out.site });
      f.classical.seen(lattice.col[out.site]!, lattice.row[out.site]!);
    }
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
      // One step of grace: the snake stops short; still blocked next step, it crashes.
      if (!this.bumped) {
        this.bumped = true;
        events.push({ type: 'bump', col: next.col, row: next.row });
        return;
      }
      this.alive = false;
      events.push({ type: 'died' });
      return;
    }
    this.bumped = false;
    this.body.unshift(next);
    let grew = false;
    // The head entering a cell measures it.
    for (const f of [...this.fruits]) {
      if (!this.fruits.includes(f)) continue;
      const site = f.psi.lattice.siteAt(next.col, next.row);
      if (site < 0) continue;
      const chance = f.psi.probability(site);
      if (chance < 1e-12) continue;
      const spread = f.psi.stats().spread;
      const from = { col: f.classical.x, row: f.classical.y };
      const here = (c: number, r: number) => c === next.col && r === next.row;
      const found = this.ask(f, here, events);
      if (found && found.fruit === f) {
        grew = true;
        const points = spreadMultiplier(spread) + FRUITS[f.kind].bonus;
        this.score += points;
        this.tick = Math.max(SNAKE.minTick, this.tick * SNAKE.speedUp);
        if (chance <= SHOCK.rareChance)
          events.push({
            type: 'paradox',
            paradox: { kind: 'rare', value: chance },
            ...next,
            from,
          });
        events.push({ type: 'ate', fruit: f.id, col: next.col, row: next.row, points });
        this.fruits = this.fruits.filter((x) => x !== f);
        for (const x of this.fruits) if (x.partner === f.id) x.partner = null;
      } else if (!found) {
        events.push({ type: 'missed', col: next.col, row: next.row });
        if (chance >= SHOCK.negativeChance)
          events.push({
            type: 'paradox',
            paradox: { kind: 'negative', value: chance },
            ...next,
            from,
          });
      }
    }
    if (!this.fruits.length) this.spawnFruits();
    if (!grew) this.body.pop();
    this.updateCone();
  }

  /**
   * Cells where a spread fruit cannot be right now although it may well be
   * on both sides: nodes of its interference pattern.
   */
  nodes(f: Fruit): Cell[] {
    const { psi } = f;
    const { lattice } = psi;
    if (psi.definiteSite() >= 0) return [];
    let max = 0;
    for (let i = 0; i < lattice.size; i++) max = Math.max(max, psi.probability(i));
    const p = (c: number, r: number) => {
      const i = lattice.siteAt(c, r);
      return i < 0 ? -1 : psi.probability(i) / max;
    };
    const out: Cell[] = [];
    for (let i = 0; i < lattice.size; i++) {
      const c = lattice.col[i]!;
      const r = lattice.row[i]!;
      if (p(c, r) > 0.02 || isSolid(this.map, c, r)) continue;
      const across =
        (p(c - 1, r) > 0.2 && p(c + 1, r) > 0.2) || (p(c, r - 1) > 0.2 && p(c, r + 1) > 0.2);
      if (across) out.push({ col: c, row: r });
    }
    return out;
  }
}
