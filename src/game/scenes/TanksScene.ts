import Phaser from 'phaser';
import { TANKS_ARENA } from '../../arcade/arenas';
import { TankGame } from '../../arcade/tanks';
import { mulberry32 } from '../../quantum/rng';
import type { EffectId } from '../../strings/effects';
import { T } from '../../strings/ui';
import { play } from '../audio';
import { CELL, COLORS } from '../constants';
import { px } from '../display';
import { emojiTexture } from '../emoji';
import { QuantumObject } from '../entities/QuantumObject';
import { Controls } from '../input/Controls';
import { openMainMenu } from '../menu';
import { fitCamera } from '../render/tiles';
import { GazeCone } from '../systems/GazeCone';
import { BRICK_VARIANTS, brickTexture } from '../textures';
import { ui } from '../ui';
import { bestScore, saveBest } from '../ui/progress';

const EFFECTS: EffectId[] = ['superposition', 'collapse', 'zeno', 'negative-result', 'tunnelling'];
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

/** Quantum Tanks (PLAN.md §9.2): renders TankGame, twin-stick or mouse control. */
export class TanksScene extends Phaser.Scene {
  private tanks!: TankGame;
  private world!: Phaser.GameObjects.Layer;
  private uiLayer!: Phaser.GameObjects.Layer;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private controls!: Controls;
  private cone!: GazeCone;
  private enemies = new Map<number, QuantumObject>();
  private bricks = new Map<string, Phaser.GameObjects.Image>();
  private gfx!: Phaser.GameObjects.Graphics;
  private running = false;
  private space!: Phaser.Input.Keyboard.Key | undefined;

  constructor() {
    super('Tanks');
  }

  create(): void {
    this.tanks = new TankGame(TANKS_ARENA, mulberry32((Math.random() * 2 ** 32) >>> 0));
    this.running = false;
    this.enemies = new Map();
    this.bricks = new Map();
    this.world = this.add.layer();
    this.uiLayer = this.add.layer();
    this.drawArena();
    this.cone = new GazeCone(this, this.world);
    this.gfx = this.add.graphics();
    this.world.add(this.gfx);
    this.controls = new Controls(this, this.uiLayer);
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.ignore(this.uiLayer);
    this.uiCamera.ignore(this.world);
    this.space = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    const t = T().arcade.tanks;
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
    overlay.handlers = {
      menu: () => this.openMenu(),
      restart: () => this.scene.restart(),
      info: () => {
        this.running = false;
        overlay.showLearnMore(EFFECTS, () => (this.running = !this.tanks.over));
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
    this.render(0);

    overlay.showArcadeIntro(
      { title: t.title, goal: t.goal, rules: t.rules, effects: EFFECTS },
      isTouchDevice(),
      { touch: t.controlsTouch, desktop: t.controlsDesktop },
      () => (this.running = true),
      () => this.openMenu(),
    );
  }

  private openMenu(): void {
    this.running = false;
    openMainMenu(this);
  }

  private drawArena(): void {
    const g = this.add.graphics();
    this.world.add(g);
    const { tanks } = this;
    for (let row = 0; row < tanks.rows; row++) {
      for (let col = 0; col < tanks.cols; col++) {
        const x = col * CELL;
        const y = row * CELL;
        const tile = tanks.tile(col, row);
        g.fillStyle(COLORS.floor, 1);
        g.fillRect(x, y, CELL, CELL);
        g.lineStyle(1, COLORS.floorLine, 1);
        g.strokeRect(x, y, CELL, CELL);
        if (tile === 'concrete') {
          g.fillStyle(0x5a6378, 1);
          g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          g.fillStyle(0x7d879e, 1);
          g.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
        } else if (tile === 'brick') {
          const img = this.add
            .image(
              x + CELL / 2,
              y + CELL / 2,
              brickTexture(this, (col * 7 + row * 3) % BRICK_VARIANTS),
            )
            .setDisplaySize(CELL, CELL);
          this.world.add(img);
          this.bricks.set(`${col},${row}`, img);
        } else if (tile === 'field') {
          g.fillStyle(COLORS.barrier, 0.45);
          g.fillRect(x, y, CELL, CELL);
          g.lineStyle(2, COLORS.barrier, 0.9);
          for (let k = 1; k <= 3; k++)
            g.lineBetween(x, y + (k * CELL) / 4, x + CELL, y + (k * CELL) / 4);
        } else if (tile === 'base') {
          this.world.add(
            this.add
              .image(x + CELL / 2, y + CELL / 2, emojiTexture(this, '🦅'))
              .setDisplaySize(CELL * 0.85, CELL * 0.85),
          );
        }
      }
    }
  }

  private updateHud(): void {
    const t = this.tanks;
    ui().setTimer(
      T().arcade.tanks.hud(t.baseHp, t.score, t.wave, Math.max(bestScore('tanks'), t.score)),
    );
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 100) / 1000;
    const state = this.controls.read(dt, this.tanks.aim);
    if (this.running && !ui().isScreenOpen) {
      let aim: number | null = null;
      if (state.gaze?.kind === 'angle') aim = state.gaze.angle;
      else if (state.gaze?.kind === 'point') {
        const w = this.cameras.main.getWorldPoint(state.gaze.x, state.gaze.y);
        aim = Math.atan2(w.y / CELL - this.tanks.player.y, w.x / CELL - this.tanks.player.x);
      }
      const mouse = this.input.mousePointer;
      const fire = this.controls.touch.used
        ? state.gaze !== null
        : Boolean(this.space?.isDown) || Boolean(mouse?.isDown && mouse.leftButtonDown());
      const events = this.tanks.update(dt, state.move, aim, fire);
      for (const e of events) this.onEvent(e);
      this.syncEnemies();
      this.updateHud();
    }
    this.render(time);
    this.controls.draw();
  }

  private onEvent(e: ReturnType<TankGame['update']>[number]): void {
    switch (e.type) {
      case 'collapsed':
        this.enemies.get(e.enemy)?.flash(e.site);
        play('collapse');
        break;
      case 'fired':
        play('click');
        break;
      case 'brick':
        this.bricks.get(`${e.col},${e.row}`)?.destroy();
        this.bricks.delete(`${e.col},${e.row}`);
        this.ring(e.col, e.row, 0xc0603f);
        play('tick');
        break;
      case 'hit':
        this.ring(e.col, e.row, COLORS.hot);
        play('boom');
        break;
      case 'miss':
        this.ring(e.col, e.row, COLORS.ghostHeat, 0.5);
        break;
      case 'base-hit':
        this.cameras.main.shake(250, 0.01);
        this.ring(this.tanks.base.col, this.tanks.base.row, COLORS.bad);
        play('boom');
        break;
      case 'wave':
        play('win');
        break;
      case 'over':
        this.gameOver();
        break;
      default:
        break;
    }
  }

  /** One ghost renderer per enemy; rebuilt when an enemy's lattice changes. */
  private syncEnemies(): void {
    const alive = new Set(this.tanks.enemies.map((e) => e.id));
    for (const [id, view] of this.enemies) {
      if (!alive.has(id)) {
        view.destroy();
        this.enemies.delete(id);
      }
    }
    for (const e of this.tanks.enemies) {
      const view = this.enemies.get(e.id);
      if (view && view.body === e) continue;
      view?.destroy();
      this.enemies.set(e.id, new QuantumObject(this, this.world, e));
    }
  }

  private gameOver(): void {
    this.running = false;
    play('lose');
    const score = this.tanks.score;
    const record = saveBest('tanks', score);
    this.time.delayedCall(800, () =>
      ui().showArcadeOver(
        score,
        bestScore('tanks'),
        record,
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

  private render(time: number): void {
    const t = this.tanks;
    this.cone.draw(t.cone, t.opaque);
    for (const v of this.enemies.values()) v.render(time);
    const g = this.gfx;
    g.clear();
    // The player's tank: hull, treads and the turret pointing where it looks.
    const x = t.player.x * CELL;
    const y = t.player.y * CELL;
    g.fillStyle(0x2f7d3f, 1);
    g.fillRoundedRect(x - 24, y - 24, 48, 48, 10);
    g.fillStyle(0x1d4f28, 1);
    g.fillRect(x - 26, y - 24, 8, 48);
    g.fillRect(x + 18, y - 24, 8, 48);
    g.lineStyle(10, 0x9be28f, 1);
    g.lineBetween(x, y, x + Math.cos(t.aim) * 34, y + Math.sin(t.aim) * 34);
    g.fillStyle(0x6fcf6a, 1);
    g.fillCircle(x, y, 13);
    // Shells.
    g.fillStyle(COLORS.gaze, 1);
    for (const s of t.shells) g.fillCircle(s.pos.x * CELL, s.pos.y * CELL, 7);
  }

  private layout(): void {
    if (!this.tanks || !this.uiCamera) return;
    const { width, height } = this.scale;
    this.cameras.main.setSize(width, height);
    this.uiCamera.setSize(width, height);
    const portrait = height > width;
    fitCamera(
      this.cameras.main,
      this.scale,
      { cols: this.tanks.cols, rows: this.tanks.rows },
      {
        top: px(ui().hudBottom() + 6),
        bottom: portrait ? px(170) : px(10),
        side: portrait ? px(6) : px(150),
      },
    );
  }
}
