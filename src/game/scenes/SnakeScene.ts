import Phaser from 'phaser';
import { SNAKE_ARENA } from '../../arcade/arenas';
import { DIR_ANGLE, SnakeGame, type Dir } from '../../arcade/snake';
import { mulberry32 } from '../../quantum/rng';
import type { EffectId } from '../../strings/effects';
import { T } from '../../strings/ui';
import { play } from '../audio';
import { CELL, COLORS } from '../constants';
import { px } from '../display';
import { QuantumObject } from '../entities/QuantumObject';
import { openMainMenu, setHash } from '../menu';
import { drawTiles, fitCamera } from '../render/tiles';
import { emojiTexture } from '../emoji';
import { GazeCone } from '../systems/GazeCone';
import { ui } from '../ui';
import { bestScore } from '../ui/progress';
import { announce, finishArcade } from '../ui/shock';
import { ArcadeMode } from '../ui/arcadeMode';
import { ParadoxLog } from '../../arcade/paradox';
import { UI_FONT } from '../constants';

const EFFECTS: EffectId[] = [
  'superposition',
  'collapse',
  'zeno',
  'negative-result',
  'entanglement',
  'decoherence',
  'interference',
  'tunnelling',
];
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
/** A finger held still this long closes the snake's eyes (ms). */
const HOLD_MS = 250;

/** Quantum Snake (PLAN.md §9.1): renders SnakeGame and feeds it turns. */
export class SnakeScene extends Phaser.Scene {
  private snake!: SnakeGame;
  private world!: Phaser.GameObjects.Layer;
  private cone!: GazeCone;
  /** One ghost renderer per fruit, by id; rebuilt when a fruit is replaced. */
  private fruits = new Map<number, QuantumObject>();
  /** Thread between entangled 🍎🍏, nodes ✖, the 🔥 patch. */
  private fx!: Phaser.GameObjects.Graphics;
  private snakeGfx!: Phaser.GameObjects.Graphics;
  private running = false;
  private swipeFrom: { x: number; y: number } | null = null;
  private holdTimer: Phaser.Time.TimerEvent | null = null;
  private log = new ParadoxLog();
  private mode!: ArcadeMode;

  constructor() {
    super('Snake');
  }

  create(): void {
    this.snake = new SnakeGame(SNAKE_ARENA, mulberry32((Math.random() * 2 ** 32) >>> 0));
    this.fruits = new Map();
    this.log = new ParadoxLog();
    this.mode = new ArcadeMode('snake', (on) => (this.snake.classical = on));
    this.running = false;
    this.world = this.add.layer();
    drawTiles(this, this.world, this.snake.map);
    this.cone = new GazeCone(this, this.world);
    this.fruits = new Map();
    // Hot cells 🔥: the environment keeps a fruit on them classical.
    for (const o of this.snake.map.objects)
      if (o.role === 'hot')
        this.world.add(
          this.add
            .image((o.col + 0.5) * CELL, (o.row + 0.5) * CELL, emojiTexture(this, '🔥'))
            .setDisplaySize(CELL * 0.7, CELL * 0.7)
            .setAlpha(0.55),
        );
    this.fx = this.add.graphics();
    this.world.add(this.fx);
    this.syncFruits();
    this.snakeGfx = this.add.graphics();
    this.world.add(this.snakeGfx);

    const s = T().arcade.snake;
    setHash('arcade:snake');
    const overlay = ui();
    overlay.closeScreen();
    overlay.setClassicalBanner(null);
    overlay.setHud({
      chapter: 0,
      title: { en: s.title, ru: s.title },
      goal: { en: s.goal, ru: s.goal },
    });
    overlay.setGlasses(null);
    overlay.setFocus(null);
    overlay.setInspectMode(false);
    overlay.setLevelTools(false);
    overlay.setArcadePad(null);
    overlay.setActionButton(null);
    overlay.handlers = {
      menu: () => this.openMenu(),
      restart: () => this.scene.restart(),
      info: () => {
        this.running = false;
        overlay.showLearnMore(EFFECTS, () => (this.running = !this.snake.alive ? false : true));
      },
      glasses: () => {},
      focus: () => {},
      inspect: () => {},
      hudResized: () => this.layout(),
    };
    this.updateHud();

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.layout();
    this.bindInput();
    this.render(0);

    overlay.showArcadeIntro(
      { title: s.title, goal: s.goal, rules: s.rules, effects: EFFECTS },
      isTouchDevice(),
      { touch: s.controlsTouch, desktop: s.controlsDesktop },
      (mode) => {
        this.mode.start(mode);
        this.running = true;
      },
      () => this.openMenu(),
    );
  }

  private openMenu(): void {
    this.running = false;
    openMainMenu(this);
  }

  private bindInput(): void {
    const keys: Record<string, Dir> = {
      ArrowUp: 'up',
      KeyW: 'up',
      ArrowDown: 'down',
      KeyS: 'down',
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
    };
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.setEyes(false);
        return;
      }
      const d = keys[e.code];
      if (d && this.running) this.snake.turn(d);
    });
    this.input.keyboard?.on('keyup', (e: KeyboardEvent) => {
      if (e.code === 'Space') this.setEyes(true);
    });
    // Swipes anywhere: each 22 px of drag in a direction is one turn.
    // A finger held still closes the eyes until it is lifted.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.swipeFrom = { x: p.x, y: p.y };
      this.holdTimer?.remove();
      this.holdTimer = this.time.delayedCall(HOLD_MS, () => this.setEyes(false));
    });
    this.input.on('pointerup', () => {
      this.swipeFrom = null;
      this.holdTimer?.remove();
      this.holdTimer = null;
      this.setEyes(true);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const from = this.swipeFrom;
      if (!from || !p.isDown || !this.running) return;
      const dx = p.x - from.x;
      const dy = p.y - from.y;
      if (Math.hypot(dx, dy) < px(22)) return;
      // A swipe, not a hold.
      this.holdTimer?.remove();
      this.holdTimer = null;
      this.snake.turn(
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up',
      );
      this.swipeFrom = { x: p.x, y: p.y };
    });
  }

  private setEyes(open: boolean): void {
    if (this.snake.eyesOpen === open) return;
    if (!open && !this.running) return;
    this.snake.setEyes(open);
    this.updateHud();
  }

  private updateHud(): void {
    const s = this.snake;
    ui().setTimer(
      T().arcade.snake.hud(
        s.score,
        Math.max(bestScore('snake'), s.score),
        this.log.total,
        s.eyesOpen,
      ),
    );
  }

  override update(time: number, deltaMs: number): void {
    if (this.running && !ui().isScreenOpen) {
      const dt = Math.min(deltaMs, 100) / 1000;
      this.mode.update(dt);
      const events = this.snake.update(dt);
      for (const e of events) {
        if (e.type === 'collapsed') {
          this.syncFruits();
          this.fruits.get(e.fruit)?.flash(e.site);
          play('collapse');
        } else if (e.type === 'ate') {
          this.ring(e.col, e.row, COLORS.good);
          this.floatText(e.col, e.row, T().arcade.points(e.points), e.points);
          play('lamp');
          this.updateHud();
        } else if (e.type === 'paradox') {
          if (e.paradox.kind === 'far') this.farLine(e.from, e);
          announce(this.log, e.paradox);
          this.updateHud();
        } else if (e.type === 'missed') {
          this.missed(e.col, e.row);
          play('pop');
        } else if (e.type === 'died') this.gameOver();
      }
      this.syncFruits();
    }
    this.render(time);
  }

  private gameOver(): void {
    this.running = false;
    play('lose');
    const score = this.snake.score;
    this.time.delayedCall(600, () =>
      finishArcade(
        'snake',
        score,
        this.mode.mode,
        this.log,
        () => this.scene.restart(),
        () => this.openMenu(),
      ),
    );
  }

  private syncFruits(): void {
    const alive = new Set(this.snake.fruits.map((f) => f.id));
    for (const [id, v] of this.fruits)
      if (!alive.has(id)) {
        v.destroy();
        this.fruits.delete(id);
      }
    for (const f of this.snake.fruits)
      if (!this.fruits.has(f.id)) this.fruits.set(f.id, new QuantumObject(this, this.world, f));
  }

  /** The 🔗 thread between an unmeasured 🍎🍏 pair, and ✖ on the nodes of each cloud. */
  private drawQuantumMarks(time: number): void {
    const g = this.fx;
    g.clear();
    for (const f of this.snake.fruits) {
      const t = f.partner !== null ? this.snake.byId(f.partner) : undefined;
      if (t && f.kind === 'apple') {
        const a = f.psi.stats();
        const b = t.psi.stats();
        const ax = (a.x + 0.5) * CELL;
        const ay = (a.y + 0.5) * CELL;
        const dx = (b.x - a.x) * CELL;
        const dy = (b.y - a.y) * CELL;
        const len = Math.hypot(dx, dy);
        const off = (time * 0.03) % 20;
        g.lineStyle(4, COLORS.thread, 0.7);
        for (let d = off - 20; d < len; d += 20) {
          const s0 = Math.max(0, d) / len;
          const s1 = Math.min(len, d + 10) / len;
          if (s1 > s0) g.lineBetween(ax + dx * s0, ay + dy * s0, ax + dx * s1, ay + dy * s1);
        }
      }
      // Nodes: the fruit may be left and right of the cell, but not in it (interference).
      g.lineStyle(3, 0x7fd4ff, 0.75);
      for (const n of this.snake.nodes(f)) {
        const x = (n.col + 0.5) * CELL;
        const y = (n.row + 0.5) * CELL;
        g.lineBetween(x - 9, y - 9, x + 9, y + 9);
        g.lineBetween(x - 9, y + 9, x + 9, y - 9);
      }
    }
  }

  /** A miss: "not here" — the cloud is pushed out of the cell (negative result). */
  private missed(col: number, row: number): void {
    const x = (col + 0.5) * CELL;
    const y = (row + 0.5) * CELL;
    const t = this.add
      .text(x, y, '∅', {
        fontFamily: UI_FONT,
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ff6b6b',
        stroke: '#0b0e1a',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setResolution(3);
    this.world.add(t);
    // A ring pushing outwards: the probability that was here moves away.
    const r = this.add.circle(x, y, CELL * 0.4).setStrokeStyle(5, COLORS.ghostHeat, 0.9);
    this.world.add(r);
    this.tweens.add({
      targets: r,
      scale: 3.5,
      alpha: 0,
      duration: 700,
      onComplete: () => r.destroy(),
    });
    this.tweens.add({
      targets: t,
      scale: 1.6,
      alpha: 0,
      duration: 800,
      onComplete: () => t.destroy(),
    });
  }

  /** "+3" rising from where an apple was eaten; bigger for a wider apple. */
  private floatText(col: number, row: number, text: string, points: number): void {
    const t = this.add
      .text((col + 0.5) * CELL, (row + 0.2) * CELL, text, {
        fontFamily: UI_FONT,
        fontSize: `${22 + 8 * points}px`,
        fontStyle: 'bold',
        color: points > 1 ? '#ffd166' : '#ffffff',
        stroke: '#0b0e1a',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setResolution(3);
    this.world.add(t);
    this.tweens.add({
      targets: t,
      y: t.y - CELL,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  /** A fading line from the classical place to where the apple really was (S1). */
  private farLine(from: { col: number; row: number }, to: { col: number; row: number }): void {
    const g = this.add.graphics();
    this.world.add(g);
    g.lineStyle(3, 0x9aa0b8, 0.9);
    g.lineBetween(
      (from.col + 0.5) * CELL,
      (from.row + 0.5) * CELL,
      (to.col + 0.5) * CELL,
      (to.row + 0.5) * CELL,
    );
    this.tweens.add({ targets: g, alpha: 0, duration: 1200, onComplete: () => g.destroy() });
  }

  private ring(col: number, row: number, colour: number): void {
    const r = this.add
      .circle((col + 0.5) * CELL, (row + 0.5) * CELL, CELL * 0.3)
      .setStrokeStyle(4, colour, 1);
    this.world.add(r);
    this.tweens.add({
      targets: r,
      scale: 2.4,
      alpha: 0,
      duration: 400,
      onComplete: () => r.destroy(),
    });
  }

  private render(time: number): void {
    this.cone.draw(
      this.snake.cone,
      (c, r) =>
        this.snake.map.tiles[r]?.[c] === 'wall' || this.snake.map.tiles[r]?.[c] === 'barrier',
    );
    for (const f of this.snake.fruits) this.fruits.get(f.id)?.render(time, f.classical);
    this.drawQuantumMarks(time);
    const g = this.snakeGfx;
    g.clear();
    const n = this.snake.body.length;
    this.snake.body.forEach((b, i) => {
      const shade = 1 - (0.45 * i) / Math.max(1, n - 1);
      g.fillStyle(i === 0 ? 0x3fbf5f : 0x5fd068, shade);
      const pad = i === 0 ? 4 : 8;
      g.fillRoundedRect(b.col * CELL + pad, b.row * CELL + pad, CELL - 2 * pad, CELL - 2 * pad, 14);
    });
    // Eyes on the head, looking where it goes.
    const h = this.snake.head;
    const a = DIR_ANGLE[this.snake.dir];
    const cx = (h.col + 0.5) * CELL + Math.cos(a) * 10;
    const cy = (h.row + 0.5) * CELL + Math.sin(a) * 10;
    for (const side of [-1, 1]) {
      const ex = cx + Math.cos(a + Math.PI / 2) * 11 * side;
      const ey = cy + Math.sin(a + Math.PI / 2) * 11 * side;
      g.fillStyle(0xffffff, 1);
      g.fillCircle(ex, ey, 7);
      g.fillStyle(0x0b0e1a, 1);
      g.fillCircle(ex + Math.cos(a) * 3, ey + Math.sin(a) * 3, 3.5);
    }
  }

  private layout(): void {
    if (!this.snake) return;
    fitCamera(this.cameras.main, this.scale, this.snake.map, {
      top: px(ui().hudBottom() + 6),
      bottom: px(12),
      side: px(8),
    });
  }
}
