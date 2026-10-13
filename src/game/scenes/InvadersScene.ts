import Phaser from 'phaser';
import { INVADERS, InvadersGame, type InvaderEvent } from '../../arcade/invaders';
import { ParadoxLog } from '../../arcade/paradox';
import type { QuantumBody } from '../systems/LevelSim';
import { mulberry32 } from '../../quantum/rng';
import type { EffectId } from '../../strings/effects';
import { T } from '../../strings/ui';
import { play } from '../audio';
import { CELL, COLORS, UI_FONT } from '../constants';
import { px } from '../display';
import { emojiTexture } from '../emoji';
import { QuantumObject } from '../entities/QuantumObject';
import { openMainMenu, setHash } from '../menu';
import { fitCamera } from '../render/tiles';
import { ui } from '../ui';
import { ArcadeMode } from '../ui/arcadeMode';
import { bestScore } from '../ui/progress';
import { announce, finishArcade } from '../ui/shock';

const EFFECTS: EffectId[] = [
  'superposition',
  'collapse',
  'zeno',
  'negative-result',
  'interference',
  'complementarity',
  'entanglement',
  'born-rule',
];
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
/** A buzz where the device can. */
const buzz = (ms: number) => navigator.vibrate?.(ms);

/** One ghost renderer per quantum body; rebuilt when the body gets a new wave (a moved trap). */
class Clouds {
  private views = new Map<number, { view: QuantumObject; psi: unknown }>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    /** Draw as a phase-coloured wave (bombs, torpedoes) rather than ghosts. */
    private readonly wave: boolean,
  ) {}

  sync(bodies: readonly (QuantumBody & { id: number })[]): void {
    const alive = new Set(bodies.map((b) => b.id));
    for (const [id, v] of this.views)
      if (!alive.has(id)) {
        v.view.destroy();
        this.views.delete(id);
      }
    for (const b of bodies) {
      const v = this.views.get(b.id);
      if (v && v.psi === b.psi && v.view.body === b) continue;
      v?.view.destroy();
      this.views.set(b.id, {
        view: new QuantumObject(this.scene, this.layer, b, this.wave),
        psi: b.psi,
      });
    }
  }

  get(id: number): QuantumObject | undefined {
    return this.views.get(id)?.view;
  }

  render(time: number, twin?: (id: number) => { x: number; y: number } | null): void {
    for (const [id, v] of this.views) v.view.render(time, twin?.(id));
  }
}

/**
 * Quantum Invaders (PLAN-IMPROVEMENTS.md §3): renders InvadersGame. Touch:
 * drag to move, hold 👁 / 🔫; desktop: arrows, Space, Shift.
 */
export class InvadersScene extends Phaser.Scene {
  private g!: InvadersGame;
  private world!: Phaser.GameObjects.Layer;
  private fx!: Phaser.GameObjects.Graphics;
  private ship!: Phaser.GameObjects.Image;
  private ufo: Phaser.GameObjects.Image[] = [];
  private ufoLabels: Phaser.GameObjects.Text[] = [];
  private invaders!: Clouds;
  private bombs!: Clouds;
  private torpedoes!: Clouds;
  private running = false;
  private log = new ParadoxLog();
  private mode!: ArcadeMode;
  /** Held by on-screen buttons. */
  private padLook = false;
  private padFire = false;
  /** Touch drag: where the finger and the ship were when it went down. */
  private drag: { id: number; x: number; ship: number } | null = null;
  private dragTarget: number | null = null;
  /** Where bombs have landed, per column (fading): the stripes build up. */
  private landed: number[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Invaders');
  }

  create(): void {
    this.g = new InvadersGame(mulberry32((Math.random() * 2 ** 32) >>> 0));
    this.log = new ParadoxLog();
    this.mode = new ArcadeMode('invaders', (on) => this.g.setClassical(on));
    this.running = false;
    this.padLook = this.padFire = false;
    this.drag = null;
    this.dragTarget = null;
    this.landed = new Array<number>(INVADERS.cols).fill(0);
    this.world = this.add.layer();
    this.drawArena();
    this.bombs = new Clouds(this, this.world, true);
    this.torpedoes = new Clouds(this, this.world, true);
    this.invaders = new Clouds(this, this.world, false);
    this.fx = this.add.graphics();
    this.world.add(this.fx);
    this.ship = this.add
      .image(0, 0, emojiTexture(this, '🚀'))
      .setDisplaySize(CELL * 0.9, CELL * 0.9)
      .setRotation(-Math.PI / 4);
    this.world.add(this.ship);
    this.ufo = [0, 1].map(() => {
      const img = this.add
        .image(0, 0, emojiTexture(this, '🛸'))
        .setDisplaySize(CELL * 0.9, CELL * 0.9)
        .setVisible(false);
      this.world.add(img);
      return img;
    });
    this.ufoLabels = [0, 1].map(() => {
      const t = this.add
        .text(0, 0, '', {
          fontFamily: UI_FONT,
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#0b0e1a',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setResolution(3)
        .setVisible(false);
      this.world.add(t);
      return t;
    });

    const t = T().arcade.invaders;
    setHash('arcade:invaders');
    const overlay = ui();
    overlay.closeScreen();
    overlay.setClassicalBanner(null);
    overlay.setHud({
      chapter: 0,
      title: { en: t.title, ru: t.title },
      goal: { en: t.goal, ru: t.goal },
    });
    overlay.setGlasses(null);
    overlay.setFocus(null);
    overlay.setInspectMode(false);
    overlay.setLevelTools(false);
    overlay.setActionButton(null);
    overlay.setArcadePad(
      isTouchDevice()
        ? {
            b: {
              label: '👁',
              aria: t.aria.look,
              press: () => (this.padLook = true),
              release: () => (this.padLook = false),
            },
            a: {
              label: '🔫',
              aria: t.aria.fire,
              press: () => (this.padFire = true),
              release: () => (this.padFire = false),
            },
            up: { label: '⚛', aria: t.aria.torpedo, press: () => this.torpedo() },
          }
        : null,
    );
    overlay.handlers = {
      menu: () => this.openMenu(),
      restart: () => this.scene.restart(),
      info: () => {
        this.running = false;
        overlay.showLearnMore(EFFECTS, () => (this.running = !this.g.over));
      },
      glasses: () => {},
      focus: () => {},
      inspect: () => {},
      hudResized: () => this.layout(),
    };
    this.updateHud();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      ui().setArcadePad(null);
      ui().setClassicalBanner(null);
    });
    this.bindInput();
    this.layout();
    this.render(0);

    overlay.showArcadeIntro(
      { title: t.title, goal: t.goal, rules: t.rules, effects: EFFECTS },
      isTouchDevice(),
      { touch: t.controlsTouch, desktop: t.controlsDesktop },
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
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = (this.input.keyboard?.addKeys({
      left: K.LEFT,
      a: K.A,
      right: K.RIGHT,
      d: K.D,
      fire: K.SPACE,
      shift: K.SHIFT,
      l: K.L,
    }) ?? {}) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on('keydown-E', () => this.torpedo());
    // Drag anywhere: the ship follows the finger sideways.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch && p.rightButtonDown()) {
        this.torpedo();
        return;
      }
      if (this.drag) return;
      this.drag = { id: p.id, x: this.worldX(p), ship: this.g.shipX };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || p.id !== this.drag.id || !p.isDown) return;
      this.dragTarget = this.drag.ship + (this.worldX(p) - this.drag.x);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.drag && p.id === this.drag.id) {
        this.drag = null;
        this.dragTarget = null;
      }
    });
  }

  private worldX(p: Phaser.Input.Pointer): number {
    return this.cameras.main.getWorldPoint(p.x, p.y).x / CELL;
  }

  private torpedo(): void {
    if (!this.running || ui().isScreenOpen) return;
    this.onEvents(this.g.launchTorpedo());
  }

  /** Space: a starfield, the shield with its two slits, side walls below it. */
  private drawArena(): void {
    const g = this.add.graphics();
    this.world.add(g);
    const { cols, rows } = INVADERS;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * CELL;
        const y = row * CELL;
        g.fillStyle(0x070914, 1);
        g.fillRect(x, y, CELL, CELL);
        for (let k = 0; k < 2; k++) {
          const h = Math.sin((col * 31 + row * 17 + k * 7) * 12.9898) * 43758.5453;
          const f = h - Math.floor(h);
          g.fillStyle(0xffffff, 0.2 + 0.4 * ((f * 7) % 1));
          g.fillCircle(x + ((f * 97) % 1) * CELL, y + ((f * 53) % 1) * CELL, 1 + ((f * 3) % 1));
        }
        if (row === INVADERS.shieldRow && !INVADERS.slits.includes(col)) {
          g.fillStyle(COLORS.barrier, 0.5);
          g.fillRect(x, y + 4, CELL, CELL - 8);
          g.lineStyle(2, COLORS.barrier, 0.95);
          g.strokeRect(x + 1, y + 4, CELL - 2, CELL - 8);
        } else if (this.g.isWall(col, row)) {
          g.fillStyle(0x4a5368, 1);
          g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          g.lineStyle(2, 0x8a95ad, 1);
          g.strokeRect(x + 6, y + 6, CELL - 12, CELL - 12);
        }
      }
    }
    // The ground line.
    g.lineStyle(2, 0x3a4260, 1);
    g.lineBetween(CELL, rows * CELL - 2, (cols - 1) * CELL, rows * CELL - 2);
  }

  private updateHud(): void {
    const g = this.g;
    ui().setTimer(
      T().arcade.invaders.hud(
        g.lives,
        g.score,
        g.wave,
        g.torpedoAmmo,
        this.log.total,
        Math.max(bestScore('invaders'), g.score),
      ),
    );
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 100) / 1000;
    if (this.running && !ui().isScreenOpen) {
      const k = this.keys;
      let move = (k.right?.isDown || k.d?.isDown ? 1 : 0) - (k.left?.isDown || k.a?.isDown ? 1 : 0);
      if (this.dragTarget !== null) {
        const diff = this.dragTarget - this.g.shipX;
        move = Math.abs(diff) < 0.05 ? 0 : Math.max(-1, Math.min(1, diff * 6));
      }
      const look = this.padLook || Boolean(k.shift?.isDown) || Boolean(k.l?.isDown);
      const fire = this.padFire || Boolean(k.fire?.isDown);
      this.mode.update(dt);
      this.onEvents(this.g.update(dt, { move, look, fire }));
      for (let c = 0; c < this.landed.length; c++) this.landed[c]! *= Math.exp(-dt / 20);
    }
    this.invaders.sync(this.g.invaders);
    this.bombs.sync(this.g.bombs);
    this.torpedoes.sync(this.g.torpedoes);
    this.render(time);
  }

  private onEvents(events: InvaderEvent[]): void {
    if (!events.length) return;
    for (const e of events) {
      switch (e.type) {
        case 'collapsed':
          this.invaders.sync(this.g.invaders);
          this.invaders.get(e.invader)?.flash(e.site);
          play('collapse');
          break;
        case 'fired':
          play('click');
          break;
        case 'hit':
          this.ring(e.col, e.row, COLORS.hot);
          this.floatText(e.col, e.row, T().arcade.points(e.points), e.points);
          play('boom');
          buzz(20);
          break;
        case 'miss':
          this.ring(e.col, e.row, COLORS.ghostHeat, 0.5);
          break;
        case 'fizzle':
          this.ring(e.col, e.row, COLORS.barrier, 0.8);
          play('tick');
          break;
        case 'landed':
          this.landed[e.col] = (this.landed[e.col] ?? 0) + 1;
          if (e.ship) {
            this.ring(e.col, INVADERS.rows - 1, COLORS.bad);
            this.cameras.main.shake(250, 0.01);
            play('boom');
            buzz(120);
          } else {
            this.ring(e.col, INVADERS.rows - 1, 0xffa552, 0.8);
            play('hit');
          }
          break;
        case 'torpedo':
          play('snap');
          break;
        case 'torpedo-hit':
          this.ring(e.col, e.row, 0x7fd4ff);
          this.ring(e.col, e.row, COLORS.hot);
          play('boom');
          break;
        case 'ufo':
          play('flash');
          break;
        case 'ufo-hit':
          this.ring(e.col, 0, COLORS.good);
          this.floatText(e.col, 0.6, T().arcade.points(e.points), 3);
          play('win');
          break;
        case 'ufo-miss':
          this.ring(e.col, 0, COLORS.ghostHeat, 0.6);
          play('collapse');
          break;
        case 'wave':
          ui().toast(T().arcade.invaders.wave(e.wave));
          play('win');
          break;
        case 'paradox':
          if (e.paradox.kind === 'far' || e.paradox.kind === 'spooky') this.line(e.from, e);
          announce(this.log, e.paradox);
          break;
        case 'over':
          this.gameOver();
          break;
        default:
          break;
      }
    }
    this.updateHud();
  }

  private gameOver(): void {
    this.running = false;
    play('lose');
    const score = this.g.score;
    this.time.delayedCall(800, () =>
      finishArcade(
        'invaders',
        score,
        this.mode.mode,
        this.log,
        () => this.scene.restart(),
        () => this.openMenu(),
      ),
    );
  }

  private ring(col: number, row: number, colour: number, alpha = 1): void {
    const r = this.add
      .circle((col + 0.5) * CELL, (row + 0.5) * CELL, CELL * 0.3)
      .setStrokeStyle(4, colour, alpha);
    this.world.add(r);
    this.tweens.add({
      targets: r,
      scale: 2.4,
      alpha: 0,
      duration: 400,
      onComplete: () => r.destroy(),
    });
  }

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

  /** A fading line between where something was expected and where it turned out to be. */
  private line(from: { col: number; row: number }, to: { col: number; row: number }): void {
    const g = this.add.graphics();
    this.world.add(g);
    g.lineStyle(3, 0xc0c6dc, 0.9);
    g.lineBetween(
      (from.col + 0.5) * CELL,
      (from.row + 0.5) * CELL,
      (to.col + 0.5) * CELL,
      (to.row + 0.5) * CELL,
    );
    this.tweens.add({ targets: g, alpha: 0, duration: 1200, onComplete: () => g.destroy() });
  }

  private render(time: number): void {
    const g = this.g;
    const fx = this.fx;
    fx.clear();
    const shipRow = INVADERS.rows - 1;

    // The searchlight: a narrow beam straight up.
    if (g.look) {
      const sx = g.shipX * CELL;
      const top = INVADERS.lightSpread * shipRow + 0.5;
      fx.fillStyle(COLORS.gaze, 0.16);
      fx.fillPoints(
        [
          new Phaser.Math.Vector2(sx - 0.5 * CELL, shipRow * CELL),
          new Phaser.Math.Vector2(sx + 0.5 * CELL, shipRow * CELL),
          new Phaser.Math.Vector2(sx + top * CELL, 0),
          new Phaser.Math.Vector2(sx - top * CELL, 0),
        ],
        true,
      );
    }

    // Where bombs have landed: a bar per column — the stripes build up.
    const most = Math.max(1, ...this.landed);
    this.landed.forEach((n, c) => {
      if (n < 0.05) return;
      const h = (n / most) * CELL * 0.6;
      fx.fillStyle(0xffa552, 0.45);
      fx.fillRect(c * CELL + 6, INVADERS.rows * CELL - h - 3, CELL - 12, h);
    });

    // ✖ where a bomb that got through will (almost) never land.
    for (const c of this.darkColumns()) {
      fx.lineStyle(3, 0x7fd4ff, 0.8);
      const x = (c + 0.5) * CELL;
      const y = (shipRow + 0.5) * CELL;
      fx.lineBetween(x - 8, y - 8, x + 8, y + 8);
      fx.lineBetween(x - 8, y + 8, x + 8, y - 8);
    }

    this.invaders.render(time, (id) => {
      const inv = g.byId(id);
      if (!inv) return null;
      const s = g.slotCell(inv.slot);
      return { x: s.col, y: s.row };
    });
    this.bombs.render(time);
    this.torpedoes.render(time);

    // Lasers.
    fx.lineStyle(6, 0xff5fd2, 1);
    for (const l of g.lasers)
      fx.lineBetween((l.col + 0.5) * CELL, l.y * CELL, (l.col + 0.5) * CELL, (l.y + 0.6) * CELL);

    // UFO in its two places.
    const u = g.ufo;
    this.ufo.forEach((img, i) => {
      const b = u?.branches[i];
      const label = this.ufoLabels[i]!;
      if (!u || !b) {
        img.setVisible(false);
        label.setVisible(false);
        return;
      }
      const x = (u.x + b.dx + 0.5) * CELL;
      img
        .setVisible(true)
        .setPosition(x, 0.5 * CELL)
        .setAlpha(0.3 + 0.7 * b.p);
      label
        .setVisible(u.branches.length > 1)
        .setText(`${Math.round(b.p * 100)}%`)
        .setPosition(x, 1.2 * CELL);
    });

    this.ship.setPosition(g.shipX * CELL, (shipRow + 0.5) * CELL);
  }

  /**
   * Columns of the ground a bomb below the shield is (almost) sure to miss —
   * under 5 % of the likeliest column — while some bomb is down there.
   */
  private darkColumns(): number[] {
    const col = new Array<number>(INVADERS.cols).fill(0);
    let below = 0;
    for (const b of this.g.bombs) {
      const { lattice } = b.psi;
      for (let i = 0; i < lattice.size; i++) {
        if (lattice.row[i]! <= INVADERS.shieldRow) continue;
        const p = b.psi.probability(i);
        col[lattice.col[i]!]! += p;
        below += p;
      }
    }
    if (below < 0.3) return [];
    const max = Math.max(...col);
    const dark: number[] = [];
    for (let c = 1; c < INVADERS.cols - 1; c++) if (col[c]! < 0.05 * max) dark.push(c);
    return dark;
  }

  private layout(): void {
    if (!this.g) return;
    const portrait = this.scale.height > this.scale.width;
    const pad = ui().buttonBarHeight();
    fitCamera(
      this.cameras.main,
      this.scale,
      { cols: INVADERS.cols, rows: INVADERS.rows },
      {
        top: px(ui().hudBottom() + 6),
        bottom: portrait ? px(pad + 6) : px(8),
        side: portrait || pad === 0 ? px(6) : px(170),
      },
    );
  }
}
