import Phaser from 'phaser';
import { ParadoxLog } from '../../arcade/paradox';
import { PONG, PongGame, aiInput, type PongEvent, type PongInput } from '../../arcade/pong';
import { mulberry32, type Rng } from '../../quantum/rng';
import type { EffectId } from '../../strings/effects';
import { T } from '../../strings/ui';
import { play } from '../audio';
import { CELL, COLORS, UI_FONT } from '../constants';
import { px } from '../display';
import { phaseColour } from '../entities/QuantumObject';
import { openMainMenu, setHash } from '../menu';
import { fitCamera } from '../render/tiles';
import { ui } from '../ui';
import { ArcadeMode } from '../ui/arcadeMode';
import { bestScore } from '../ui/progress';
import { announce, finishArcade } from '../ui/shock';

const EFFECTS: EffectId[] = [
  'superposition',
  'collapse',
  'uncertainty',
  'negative-result',
  'tunnelling',
  'decoherence',
];
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
/** Size of one lattice site on screen: two per visual cell. */
const SITE = CELL / 2;
/** Fingers below this row (in sites) steer the paddle; above it, they look. */
const PADDLE_ZONE = PONG.rows - 6;

/**
 * Quantum Pong (PLAN-IMPROVEMENTS.md §5): renders PongGame. Touch: drag at
 * the bottom for the paddle, hold on your half to look; desktop: mouse.
 */
export class PongScene extends Phaser.Scene {
  private g!: PongGame;
  private gfx!: Phaser.GameObjects.Graphics;
  private running = false;
  private log = new ParadoxLog();
  private mode!: ArcadeMode;
  private aiRng!: Rng;
  /** Which pointer steers the paddle and which one looks (multi-touch). */
  private paddlePointer: number | null = null;
  private lookPointer: number | null = null;
  private paddleTarget: number | null = null;
  private lookAt: { x: number; y: number } | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastSeen = 0;

  constructor() {
    super('Pong');
  }

  create(): void {
    this.g = new PongGame(mulberry32((Math.random() * 2 ** 32) >>> 0));
    this.aiRng = mulberry32((Math.random() * 2 ** 32) >>> 0);
    this.log = new ParadoxLog();
    this.mode = new ArcadeMode('pong', (on) => this.g.setClassical(on));
    this.running = false;
    this.paddlePointer = this.lookPointer = null;
    this.paddleTarget = null;
    this.lookAt = null;
    this.drawField();
    this.gfx = this.add.graphics();

    const t = T().arcade.pong;
    setHash('arcade:pong');
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
    overlay.setArcadePad(null);
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
      ui().setClassicalBanner(null);
    });
    this.bindInput();
    this.layout();
    this.render();

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

  /** A pointer in lattice sites. */
  private site(p: Phaser.Input.Pointer): { x: number; y: number } {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    return { x: w.x / SITE, y: w.y / SITE };
  }

  private bindInput(): void {
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = (this.input.keyboard?.addKeys({
      left: K.LEFT,
      a: K.A,
      right: K.RIGHT,
      d: K.D,
      look: K.SPACE,
    }) ?? {}) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const at = this.site(p);
      if (p.wasTouch && at.y >= PADDLE_ZONE) {
        this.paddlePointer = p.id;
        this.paddleTarget = at.x;
      } else {
        this.lookPointer = p.id;
        this.lookAt = at;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const at = this.site(p);
      // A mouse always steers the paddle.
      if (!p.wasTouch || p.id === this.paddlePointer) this.paddleTarget = at.x;
      if (p.id === this.lookPointer) this.lookAt = at;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.id === this.paddlePointer) this.paddlePointer = null;
      if (p.id === this.lookPointer) {
        this.lookPointer = null;
        this.lookAt = null;
      }
    });
  }

  /** The table: goal zones, the centre line, the thin wall in front of the computer's goal. */
  private drawField(): void {
    const g = this.add.graphics();
    const w = PONG.cols * SITE;
    const h = PONG.rows * SITE;
    g.fillStyle(0x0b1222, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(COLORS.bad, 0.12);
    g.fillRect(0, PONG.playerGoal[0]! * SITE, w, PONG.playerGoal.length * SITE);
    g.fillStyle(0x7fd4ff, 0.1);
    g.fillRect(0, 0, w, PONG.aiGoal.length * SITE);
    g.lineStyle(2, 0x3a4260, 1);
    for (let x = 0; x < w; x += 24) g.lineBetween(x, h / 2, x + 12, h / 2);
    g.strokeRect(1, 1, w - 2, h - 2);
    for (let c = PONG.wallCols[0]; c <= PONG.wallCols[1]; c++) {
      g.fillStyle(COLORS.barrier, 0.55);
      g.fillRect(c * SITE, PONG.wallRow * SITE + 3, SITE, SITE - 6);
    }
    g.lineStyle(2, COLORS.barrier, 0.95);
    g.strokeRect(
      PONG.wallCols[0] * SITE,
      PONG.wallRow * SITE + 3,
      (PONG.wallCols[1] - PONG.wallCols[0] + 1) * SITE,
      SITE - 6,
    );
  }

  private updateHud(): void {
    const g = this.g;
    ui().setTimer(
      T().arcade.pong.hud(
        g.points.player,
        g.points.ai,
        Math.round(g.energy.player),
        g.score,
        this.log.total,
        Math.max(bestScore('pong'), g.score),
      ),
    );
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.running && !ui().isScreenOpen) {
      const k = this.keys;
      const steer =
        (k.right?.isDown || k.d?.isDown ? 1 : 0) - (k.left?.isDown || k.a?.isDown ? 1 : 0);
      if (steer) this.paddleTarget = this.g.paddles.player + steer * 3;
      const mouse = this.input.mousePointer;
      let look = this.lookAt;
      if (!look && k.look?.isDown && mouse) look = this.site(mouse);
      const player: PongInput = { paddle: this.paddleTarget, look };
      this.mode.update(dt);
      this.onEvents(
        this.g.update(dt, player, aiInput(this.g, 'ai', 'sometimes', this.aiRng)),
        time,
      );
      this.updateHud();
    }
    this.render();
  }

  private onEvents(events: PongEvent[], time: number): void {
    for (const e of events) {
      switch (e.type) {
        case 'serve':
          play('click');
          break;
        case 'return':
          this.ring(e.x, e.y, e.side === 'player' ? COLORS.good : 0x7fd4ff);
          if (e.side === 'player') this.floatText(e.x, e.y, T().arcade.points(e.points), e.points);
          play('hit');
          if (e.side === 'player') navigator.vibrate?.(15);
          break;
        case 'point':
          this.ring(e.x, e.y, e.winner === 'player' ? COLORS.good : COLORS.bad);
          play(e.winner === 'player' ? 'lamp' : 'boom');
          if (e.winner === 'ai') this.cameras.main.shake(200, 0.008);
          break;
        case 'seen':
          // One flash per look, not one per caught photon.
          if (time - this.lastSeen > 400) {
            this.ring(e.x, e.y, COLORS.collapse);
            play('collapse');
          }
          this.lastSeen = time;
          break;
        case 'paradox':
          if (e.paradox.kind === 'far') this.line(e.from, e);
          announce(this.log, e.paradox);
          break;
        case 'over':
          this.gameOver(e.winner === 'player');
          break;
      }
    }
  }

  private gameOver(won: boolean): void {
    this.running = false;
    play(won ? 'win' : 'lose');
    ui().toast(won ? T().arcade.pong.win : T().arcade.pong.lose);
    const score = this.g.score;
    this.time.delayedCall(1200, () =>
      finishArcade(
        'pong',
        score,
        this.mode.mode,
        this.log,
        () => this.scene.restart(),
        () => this.openMenu(),
      ),
    );
  }

  private ring(x: number, y: number, colour: number): void {
    const r = this.add
      .circle((x + 0.5) * SITE, (y + 0.5) * SITE, SITE * 0.8)
      .setStrokeStyle(4, colour, 1);
    this.tweens.add({
      targets: r,
      scale: 2.5,
      alpha: 0,
      duration: 400,
      onComplete: () => r.destroy(),
    });
  }

  private floatText(x: number, y: number, text: string, points: number): void {
    const t = this.add
      .text((x + 0.5) * SITE, (y - 1) * SITE, text, {
        fontFamily: UI_FONT,
        fontSize: `${22 + 8 * points}px`,
        fontStyle: 'bold',
        color: points > 1 ? '#ffd166' : '#ffffff',
        stroke: '#0b0e1a',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setResolution(3);
    this.tweens.add({
      targets: t,
      y: t.y - CELL,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  private line(from: { x: number; y: number }, to: { x: number; y: number }): void {
    const g = this.add.graphics();
    g.lineStyle(3, 0xc0c6dc, 0.9);
    g.lineBetween(
      (from.x + 0.5) * SITE,
      (from.y + 0.5) * SITE,
      (to.x + 0.5) * SITE,
      (to.y + 0.5) * SITE,
    );
    this.tweens.add({ targets: g, alpha: 0, duration: 1200, onComplete: () => g.destroy() });
  }

  private render(): void {
    const g = this.g;
    const fx = this.gfx;
    fx.clear();

    // The ball: a wave coloured by its phase (S5), or a point when it is pinned down.
    const e = g.expected();
    if (g.pause <= 0) {
      if (g.classical || e.spread < 1) {
        fx.fillStyle(0xffffff, 1);
        fx.fillCircle((e.x + 0.5) * SITE, (e.y + 0.5) * SITE, SITE * 0.7);
      } else {
        const { psi, lattice } = g;
        let max = 0;
        for (let i = 0; i < lattice.size; i++) max = Math.max(max, psi.probability(i));
        for (let i = 0; i < lattice.size; i++) {
          const rel = psi.probability(i) / max;
          if (rel < 0.06) continue;
          fx.fillStyle(phaseColour(psi.re[i]!, psi.im[i]!), 0.15 + 0.75 * rel);
          fx.fillRect(lattice.col[i]! * SITE + 1, lattice.row[i]! * SITE + 1, SITE - 2, SITE - 2);
        }
        // Where a classical ball would be (S1).
        fx.lineStyle(3, 0xc0c6dc, 0.8);
        const tx = (g.twin.x + 0.5) * SITE;
        const ty = (g.twin.y + 0.5) * SITE;
        for (let a = 0; a < 12; a += 2)
          fx.beginPath()
            .arc(tx, ty, SITE * 0.8, (a * Math.PI) / 6, ((a + 1) * Math.PI) / 6)
            .strokePath();
      }
    }

    // Looks: the light of each side.
    for (const [side, colour] of [
      ['player', COLORS.gaze],
      ['ai', 0xffa552],
    ] as const) {
      const at = g.looking[side];
      if (!at) continue;
      fx.fillStyle(colour, 0.12);
      fx.fillCircle(at.x * SITE, at.y * SITE, PONG.lookRadius * SITE);
      fx.lineStyle(2, colour, 0.6);
      fx.strokeCircle(at.x * SITE, at.y * SITE, PONG.lookRadius * SITE);
    }

    // Paddles.
    for (const [side, rows, colour] of [
      ['player', PONG.playerRows, 0x5fd068],
      ['ai', PONG.aiRows, 0xff8fb1],
    ] as const) {
      const x = (g.paddles[side] - PONG.paddleHalf) * SITE;
      fx.fillStyle(colour, 1);
      fx.fillRoundedRect(
        x,
        rows[0]! * SITE + 4,
        PONG.paddleHalf * 2 * SITE,
        rows.length * SITE - 8,
        10,
      );
    }
  }

  private layout(): void {
    if (!this.g) return;
    fitCamera(
      this.cameras.main,
      this.scale,
      { cols: PONG.cols / 2, rows: PONG.rows / 2 },
      { top: px(ui().hudBottom() + 6), bottom: px(10), side: px(6) },
    );
  }
}
