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
import { GazeCone } from '../systems/GazeCone';
import { ui } from '../ui';
import { bestScore } from '../ui/progress';
import { announce, finishArcade } from '../ui/shock';
import { ArcadeMode } from '../ui/arcadeMode';
import { ParadoxLog } from '../../arcade/paradox';
import { UI_FONT } from '../constants';

const EFFECTS: EffectId[] = ['superposition', 'collapse', 'zeno', 'negative-result', 'tunnelling'];
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
/** A finger held still this long closes the snake's eyes (ms). */
const HOLD_MS = 250;

/** Quantum Snake (PLAN.md §9.1): renders SnakeGame and feeds it turns. */
export class SnakeScene extends Phaser.Scene {
  private snake!: SnakeGame;
  private world!: Phaser.GameObjects.Layer;
  private cone!: GazeCone;
  private apples: QuantumObject[] = [];
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
    this.log = new ParadoxLog();
    this.mode = new ArcadeMode('snake', (on) => (this.snake.classical = on));
    this.running = false;
    this.world = this.add.layer();
    drawTiles(this, this.world, this.snake.map);
    this.cone = new GazeCone(this, this.world);
    this.apples = this.snake.apples.map((a) => new QuantumObject(this, this.world, a));
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
          this.apples[e.apple]?.flash(e.site);
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
          this.ring(e.col, e.row, COLORS.bad);
          play('tick');
        } else if (e.type === 'died') this.gameOver();
      }
      // A new apple replaces an eaten one: rebuild its ghosts.
      this.snake.apples.forEach((a, i) => {
        if (this.apples[i] && (this.apples[i] as unknown as { body: unknown }).body !== a) {
          this.apples[i]!.destroy();
          this.apples[i] = new QuantumObject(this, this.world, a);
        }
      });
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
    this.apples.forEach((a, i) => a.render(time, this.snake.twins[i]));
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
