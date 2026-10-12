import { floodLattice } from '../quantum/lattice';
import type { Rng } from '../quantum/rng';
import { Superposition } from '../quantum/superposition';
import { moveWithCollisions, type Vec2 } from '../game/systems/movement';
import { cellSeen, type Cone } from '../game/systems/sight';
import type { QuantumBody } from '../game/systems/LevelSim';

export type TankTile = 'floor' | 'concrete' | 'brick' | 'field' | 'base';

/** Tunable numbers of Quantum Tanks (PLAN.md §9.2). */
export const TANKS = {
  playerSpeed: 3,
  playerRadius: 0.4,
  viewRange: 6,
  viewHalfAngle: (25 * Math.PI) / 180,
  shellSpeed: 12,
  fireCooldown: 0.45,
  /** Enemy clouds spread at this hopping rate (1/s). */
  enemyHop: 0.7,
  /** Barrier height on force fields, in units of the hopping rate. */
  field: 4.5,
  /**
   * Game rule, not physics: every second an enemy cloud's amplitude is
   * tilted by exp(-pull·distance-to-base), so the tanks are drawn towards the
   * base. Superposition, collapse, Zeno and tunnelling are untouched.
   */
  pull: 0.35,
  /** The base notices an enemy cloud on its cell this often per second. */
  baseRate: 3,
  baseHp: 3,
  /** Enemies on the field at once, and the gap between arrivals (s), for wave 1. */
  maxEnemies: 3,
  spawnEvery: 5,
  perWave: 6,
} as const;

export interface Shell {
  pos: Vec2;
  dir: Vec2;
}

export interface Enemy extends QuantumBody {
  id: number;
}

export type TankEvent =
  /** `enemy` is the enemy's id. */
  | { type: 'collapsed'; enemy: number; site: number }
  | { type: 'fired' }
  | { type: 'brick'; col: number; row: number }
  | { type: 'shell-stopped'; col: number; row: number }
  | { type: 'hit'; enemy: number; col: number; row: number }
  | { type: 'miss'; col: number; row: number }
  | { type: 'base-hit' }
  | { type: 'spawn'; enemy: number }
  | { type: 'wave'; wave: number }
  | { type: 'over' };

const TILE: Readonly<Record<string, TankTile>> = {
  '#': 'concrete',
  x: 'brick',
  '%': 'field',
  H: 'base',
};

/**
 * Quantum Tanks, engine-free (PLAN.md §9.2). Enemy tanks are quantum objects
 * like the sandbox cat: they spread while unseen, the turret's view collapses
 * them and a steady look freezes them (Zeno). Shells measure the cells they
 * cross. Enemy clouds tunnel through force fields; the base is a detector.
 */
export class TankGame {
  readonly cols: number;
  readonly rows: number;
  readonly tiles: TankTile[][];
  readonly spawns: { col: number; row: number }[] = [];
  readonly base: { col: number; row: number };
  player: Vec2;
  aim = -Math.PI / 2;
  cone: Cone;
  enemies: Enemy[] = [];
  shells: Shell[] = [];
  baseHp: number = TANKS.baseHp;
  score = 0;
  wave = 1;
  over = false;
  /** Steps from each cell to the base (through floor and fields), for the pull. */
  private readonly distance = new Map<string, number>();
  private spawned = 0;
  private spawnIn = 1;
  private cooldown = 0;
  private nextId = 0;

  constructor(
    arena: readonly string[],
    private readonly rng: Rng,
  ) {
    this.rows = arena.length;
    this.cols = arena[0]!.length;
    let player: Vec2 = { x: 1.5, y: 1.5 };
    let base = { col: 0, row: 0 };
    this.tiles = arena.map((line, row) =>
      [...line].map((ch, col) => {
        if (ch === 'E') this.spawns.push({ col, row });
        if (ch === '@') player = { x: col + 0.5, y: row + 0.5 };
        if (ch === 'H') base = { col, row };
        return TILE[ch] ?? 'floor';
      }),
    );
    this.player = player;
    this.base = base;
    this.cone = this.makeCone();
    this.measureDistances();
  }

  /** Breadth-first distances to the base over cells an enemy wave can occupy. */
  private measureDistances(): void {
    this.distance.clear();
    const queue = [this.base];
    this.distance.set(`${this.base.col},${this.base.row}`, 0);
    for (let i = 0; i < queue.length; i++) {
      const { col, row } = queue[i]!;
      const d = this.distance.get(`${col},${row}`)!;
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const c = col + dc;
        const r = row + dr;
        const key = `${c},${r}`;
        if (this.distance.has(key) || !this.waveOpen(c, r)) continue;
        this.distance.set(key, d + 1);
        queue.push({ col: c, row: r });
      }
    }
  }

  /** The pull towards the base (see TANKS.pull). */
  private pullTowardsBase(e: Enemy, dt: number): void {
    const { lattice } = e.psi;
    const k = TANKS.pull * dt;
    for (let i = 0; i < lattice.size; i++) {
      const d = this.distance.get(`${lattice.col[i]},${lattice.row[i]}`) ?? 99;
      const f = Math.exp(-k * d);
      e.psi.re[i]! *= f;
      e.psi.im[i]! *= f;
    }
    e.psi.evolve(0); // renormalize
  }

  tile(c: number, r: number): TankTile {
    return this.tiles[r]?.[c] ?? 'concrete';
  }

  /** The player tank cannot enter anything but floor. */
  solid = (c: number, r: number): boolean => this.tile(c, r) !== 'floor';
  /** Concrete, bricks and fields block the view. */
  opaque = (c: number, r: number): boolean => {
    const t = this.tile(c, r);
    return t === 'concrete' || t === 'brick' || t === 'field';
  };
  /** Where an enemy wave can be: floor, the base, and fields it tunnels into. */
  private waveOpen = (c: number, r: number): boolean => {
    const t = this.tile(c, r);
    return t === 'floor' || t === 'field' || t === 'base';
  };

  private makeCone(): Cone {
    return {
      origin: this.player,
      angle: this.aim,
      range: TANKS.viewRange,
      halfAngle: TANKS.viewHalfAngle,
    };
  }

  private newEnemyAt(at: { col: number; row: number }, from?: Superposition): Enemy {
    const lattice = floodLattice(at, this.waveOpen);
    const potential = Array.from(lattice.col, (c, i) =>
      this.tile(c, lattice.row[i]!) === 'field' ? TANKS.field * TANKS.enemyHop : 0,
    );
    const psi = new Superposition(
      lattice,
      lattice.siteAt(at.col, at.row),
      TANKS.enemyHop,
      potential,
    );
    if (from) {
      // Carry the old wave over to the new (bigger) lattice.
      psi.re.fill(0);
      psi.im.fill(0);
      for (let i = 0; i < from.lattice.size; i++) {
        const j = lattice.siteAt(from.lattice.col[i]!, from.lattice.row[i]!);
        if (j >= 0) {
          psi.re[j] = from.re[i]!;
          psi.im[j] = from.im[i]!;
        }
      }
    }
    return {
      id: this.nextId++,
      def: { char: 'E', role: 'quantum', emoji: '👾', col: at.col, row: at.row },
      psi,
      seen: new Array<boolean>(lattice.size).fill(false),
    };
  }

  /** A brick is gone: enemy clouds may now flow into its cell. */
  private openCell(): void {
    this.enemies = this.enemies.map((e) => {
      let best = 0;
      for (let i = 0; i < e.psi.lattice.size; i++)
        if (e.psi.probability(i) > e.psi.probability(best)) best = i;
      const at = { col: e.psi.lattice.col[best]!, row: e.psi.lattice.row[best]! };
      const next = this.newEnemyAt(at, e.psi);
      return { ...next, id: e.id };
    });
  }

  /**
   * @param move direction to drive, length ≤ 1
   * @param aim turret angle, or null to keep it
   * @param fire trigger held
   */
  update(dt: number, move: Vec2, aim: number | null, fire: boolean): TankEvent[] {
    const events: TankEvent[] = [];
    if (this.over) return events;

    // Drive and aim.
    const steps = Math.max(1, Math.ceil(TANKS.playerSpeed * dt * 4));
    const d = (TANKS.playerSpeed * dt) / steps;
    for (let i = 0; i < steps; i++) {
      this.player = moveWithCollisions(
        this.player,
        { x: move.x * d, y: move.y * d },
        TANKS.playerRadius,
        this.solid,
      );
    }
    if (aim !== null) this.aim = aim;
    this.cone = this.makeCone();

    // Enemies arrive in waves.
    this.spawnIn -= dt;
    const quota = TANKS.perWave + 2 * (this.wave - 1);
    const maxNow = TANKS.maxEnemies + Math.floor((this.wave - 1) / 2);
    if (this.spawnIn <= 0 && this.spawned < quota && this.enemies.length < maxNow) {
      const at = this.spawns[Math.floor(this.rng.next() * this.spawns.length)]!;
      const e = this.newEnemyAt(at);
      this.enemies.push(e);
      this.spawned++;
      this.spawnIn = Math.max(1.5, TANKS.spawnEvery - 0.5 * (this.wave - 1));
      events.push({ type: 'spawn', enemy: e.id });
    }
    if (this.spawned >= quota && this.enemies.length === 0) {
      this.wave++;
      this.spawned = 0;
      this.spawnIn = 2;
      events.push({ type: 'wave', wave: this.wave });
    }

    // Unseen enemies spread; the turret's view measures them every frame (Zeno freezes them).
    this.enemies.forEach((e) => {
      e.psi.evolve(dt);
      if (e.psi.definiteSite() < 0) this.pullTowardsBase(e, dt);
      const { lattice } = e.psi;
      for (let i = 0; i < lattice.size; i++)
        e.seen[i] = cellSeen(this.cone, lattice.col[i]!, lattice.row[i]!, this.opaque);
      const wasDefinite = e.psi.definiteSite() >= 0;
      const out = e.psi.measure(e.seen, this.rng);
      if (out.kind === 'found' && !wasDefinite)
        events.push({ type: 'collapsed', enemy: e.id, site: out.site });
    });

    // The base is a detector: a cloud on it may click.
    const baseMask = (e: Enemy) => {
      const w = new Array<number>(e.psi.lattice.size).fill(0);
      const s = e.psi.lattice.siteAt(this.base.col, this.base.row);
      if (s >= 0) w[s] = 1;
      return w;
    };
    this.enemies = this.enemies.filter((e) => {
      const out = e.psi.measureSoft(baseMask(e), TANKS.baseRate * dt, 0, this.rng);
      if (out.kind !== 'found') return true;
      this.baseHp--;
      events.push({ type: 'base-hit' });
      return false;
    });
    if (this.baseHp <= 0) {
      this.over = true;
      events.push({ type: 'over' });
      return events;
    }

    // Fire.
    this.cooldown -= dt;
    if (fire && this.cooldown <= 0) {
      this.cooldown = TANKS.fireCooldown;
      this.shells.push({
        pos: { ...this.player },
        dir: { x: Math.cos(this.aim), y: Math.sin(this.aim) },
      });
      events.push({ type: 'fired' });
    }
    this.moveShells(dt, events);
    return events;
  }

  /** Shells fly straight; every new cell they enter is measured for each enemy. */
  private moveShells(dt: number, events: TankEvent[]): void {
    const keep: Shell[] = [];
    let opened = false;
    for (const s of this.shells) {
      let alive = true;
      const dist = TANKS.shellSpeed * dt;
      const sub = Math.ceil(dist / 0.2);
      for (let k = 0; k < sub && alive; k++) {
        const before = { col: Math.floor(s.pos.x), row: Math.floor(s.pos.y) };
        s.pos = { x: s.pos.x + (s.dir.x * dist) / sub, y: s.pos.y + (s.dir.y * dist) / sub };
        const c = Math.floor(s.pos.x);
        const r = Math.floor(s.pos.y);
        if (c === before.col && r === before.row) continue;
        const t = this.tile(c, r);
        if (t === 'brick') {
          this.tiles[r]![c] = 'floor';
          opened = true;
          events.push({ type: 'brick', col: c, row: r });
          alive = false;
          break;
        }
        if (t === 'concrete' || t === 'field' || t === 'base') {
          events.push({ type: 'shell-stopped', col: c, row: r });
          alive = false;
          break;
        }
        // A shell crossing a cell asks every enemy "are you here?".
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i]!;
          const site = e.psi.lattice.siteAt(c, r);
          if (site < 0 || e.psi.probability(site) < 1e-9) continue;
          const mask = new Array<boolean>(e.psi.lattice.size).fill(false);
          mask[site] = true;
          const out = e.psi.measure(mask, this.rng);
          if (out.kind === 'found') {
            events.push({ type: 'hit', enemy: e.id, col: c, row: r });
            this.enemies.splice(i, 1);
            this.score++;
            alive = false;
            break;
          }
          events.push({ type: 'miss', col: c, row: r });
        }
      }
      if (alive) keep.push(s);
    }
    this.shells = keep;
    if (opened) {
      this.measureDistances();
      this.openCell();
    }
  }
}
