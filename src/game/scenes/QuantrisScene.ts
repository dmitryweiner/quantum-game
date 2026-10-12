import Phaser from 'phaser';
import { QUANTRIS, QuantrisGame, pieceCells, type QuantrisEvent } from '../../arcade/quantris';
import { mulberry32 } from '../../quantum/rng';
import type { EffectId } from '../../strings/effects';
import { T } from '../../strings/ui';
import { play } from '../audio';
import { CELL, COLORS, UI_FONT } from '../constants';
import { px } from '../display';
import { openMainMenu, setHash } from '../menu';
import { fitCamera } from '../render/tiles';
import { ui } from '../ui';
import { bestScore, saveBest } from '../ui/progress';

const EFFECTS: EffectId[] = ['superposition', 'collapse', 'born-rule'];
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
/** One colour per tetromino (I O T S Z J L). */
const COLOURS = [0x5fd3ff, 0xffd166, 0xc77dff, 0x7bd88f, 0xff6b6b, 0x5a8dee, 0xffa552];
/**
 * Where things go, in cells: landscape — the "next" box right of the board;
 * portrait — above it, so the board can use the full width.
 */
function arrangement(portrait: boolean) {
  return portrait
    ? {
        board: { x: 0, y: 5 },
        panel: { x: 2.5, y: 0.6 },
        world: { cols: QUANTRIS.cols, rows: QUANTRIS.rows + 5 },
      }
    : {
        board: { x: 0, y: 0 },
        panel: { x: QUANTRIS.cols + 1, y: 1 },
        world: { cols: QUANTRIS.cols + 6, rows: QUANTRIS.rows },
      };
}

/** Quantris (PLAN.md §9.3): renders QuantrisGame; keys or a button bar. */
export class QuantrisScene extends Phaser.Scene {
  private q!: QuantrisGame;
  private gfx!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private running = false;
  private at = arrangement(false);
  private nextLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('Quantris');
  }

  create(): void {
    this.q = new QuantrisGame(mulberry32((Math.random() * 2 ** 32) >>> 0));
    this.running = false;
    this.gfx = this.add.graphics();
    this.labels = [0, 1].map(() =>
      this.add
        .text(0, 0, '', {
          fontFamily: UI_FONT,
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#0b0e1a',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setResolution(3),
    );
    this.nextLabel = this.add
      .text(0, 0, T().arcade.quantris.next, {
        fontFamily: UI_FONT,
        fontSize: '28px',
        color: '#8b93b8',
      })
      .setOrigin(0.5)
      .setResolution(3);

    const t = T().arcade.quantris;
    setHash('arcade:quantris');
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
    overlay.setArcadePad(
      isTouchDevice()
        ? {
            up: { label: '⏬', aria: t.aria.drop, press: () => this.act(() => this.q.hardDrop()) },
            left: {
              label: '◀',
              aria: t.aria.left,
              press: () => this.act(() => this.q.move(-1)),
              repeat: true,
            },
            right: {
              label: '▶',
              aria: t.aria.right,
              press: () => this.act(() => this.q.move(1)),
              repeat: true,
            },
            down: {
              label: '▼',
              aria: t.aria.down,
              press: () => this.act(() => this.q.softDrop()),
              repeat: true,
            },
            a: {
              label: '⟳',
              aria: t.aria.rotate,
              press: () => this.act(() => (this.q.rotate(), [])),
            },
            b: { label: '👁', aria: t.aria.look, press: () => this.act(() => this.q.look()) },
          }
        : null,
    );
    overlay.handlers = {
      menu: () => this.openMenu(),
      restart: () => this.scene.restart(),
      info: () => {
        this.running = false;
        overlay.showLearnMore(EFFECTS, () => (this.running = !this.q.over));
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
    });
    this.layout();
    this.bindKeys();
    this.render();

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

  /** Runs a player action while the game is on, then reacts to what happened. */
  private act(fn: () => QuantrisEvent[]): void {
    if (!this.running || ui().isScreenOpen) return;
    this.onEvents(fn());
    this.render();
  }

  private bindKeys(): void {
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const map: Record<string, () => QuantrisEvent[]> = {
        ArrowLeft: () => this.q.move(-1),
        ArrowRight: () => this.q.move(1),
        ArrowUp: () => (this.q.rotate(), []),
        ArrowDown: () => this.q.softDrop(),
        Space: () => this.q.hardDrop(),
        KeyL: () => this.q.look(),
      };
      const fn = map[e.code];
      if (fn) {
        e.preventDefault();
        this.act(fn);
      }
    });
  }

  private onEvents(events: QuantrisEvent[]): void {
    for (const e of events) {
      if (e.type === 'collapsed') play('collapse');
      else if (e.type === 'merged') play('snap');
      else if (e.type === 'locked') play('hit');
      else if (e.type === 'lines') play('lamp');
      else if (e.type === 'over') this.gameOver();
    }
    this.updateHud();
  }

  private updateHud(): void {
    const q = this.q;
    ui().setTimer(
      T().arcade.quantris.hud(q.score, q.lines, q.looks, Math.max(bestScore('quantris'), q.score)),
    );
  }

  override update(_time: number, deltaMs: number): void {
    if (this.running && !ui().isScreenOpen) {
      const events = this.q.update(Math.min(deltaMs, 100) / 1000);
      if (events.length) this.onEvents(events);
    }
    this.render();
  }

  private gameOver(): void {
    this.running = false;
    play('lose');
    const score = this.q.score;
    const record = saveBest('quantris', score);
    this.time.delayedCall(600, () =>
      ui().showArcadeOver(
        score,
        bestScore('quantris'),
        record,
        () => this.scene.restart(),
        () => this.openMenu(),
      ),
    );
  }

  /** A block at board cell (x, y); `onBoard: false` places it in world cells instead. */
  private block(x: number, y: number, colour: number, alpha: number, onBoard = true): void {
    const g = this.gfx;
    if (onBoard) {
      x += this.at.board.x;
      y += this.at.board.y;
    }
    g.fillStyle(colour, alpha);
    g.fillRoundedRect(x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 6, 8);
    g.fillStyle(0xffffff, 0.18 * alpha);
    g.fillRect(x * CELL + 8, y * CELL + 6, CELL - 16, 6);
  }

  private render(): void {
    const g = this.gfx;
    const q = this.q;
    g.clear();
    const bx = this.at.board.x * CELL;
    const by = this.at.board.y * CELL;
    const w = QUANTRIS.cols * CELL;
    const h = QUANTRIS.rows * CELL;
    // Well and stack.
    g.fillStyle(COLORS.floor, 1);
    g.fillRect(bx, by, w, h);
    g.lineStyle(1, COLORS.floorLine, 1);
    for (let c = 0; c <= QUANTRIS.cols; c++)
      g.lineBetween(bx + c * CELL, by, bx + c * CELL, by + h);
    for (let r = 0; r <= QUANTRIS.rows; r++)
      g.lineBetween(bx, by + r * CELL, bx + w, by + r * CELL);
    q.board.forEach((row, r) => row.forEach((k, c) => k >= 0 && this.block(c, r, COLOURS[k]!, 1)));

    // The falling piece: each place drawn as strong as its chance, with its landing shadow.
    const { kind, rot, y, branches } = q.piece;
    const quantum = branches.length > 1;
    branches.forEach((b, i) => {
      let land = y;
      while (q.fits(kind, rot, b.x, land + 1)) land++;
      g.lineStyle(3, COLOURS[kind]!, 0.35);
      for (const [cx, cy] of pieceCells(kind, rot, b.x, land)) {
        g.strokeRoundedRect(bx + cx * CELL + 4, by + cy * CELL + 4, CELL - 8, CELL - 8, 8);
      }
      const cells = pieceCells(kind, rot, b.x, y);
      for (const [cx, cy] of cells)
        if (cy >= 0) this.block(cx, cy, COLOURS[kind]!, quantum ? 0.25 + 0.6 * b.p : 1);
      const label = this.labels[i]!;
      label.setVisible(quantum);
      if (quantum) {
        const top = cells.reduce((a, c) => (c[1] < a[1] ? c : a));
        label
          .setText(`${Math.round(b.p * 100)}%`)
          .setPosition(bx + (top[0] + 0.5) * CELL, by + Math.max(0.5, top[1] - 0.4) * CELL);
      }
    });
    if (!quantum) this.labels[1]!.setVisible(false);

    // Next piece.
    const { panel } = this.at;
    g.lineStyle(2, COLORS.floorLine, 1);
    g.strokeRoundedRect(panel.x * CELL, panel.y * CELL, 5 * CELL, 4 * CELL, 12);
    this.nextLabel.setPosition((panel.x + 2.5) * CELL, (panel.y - 0.35) * CELL);
    const n = q.next;
    const two = n.branches.length > 1;
    n.branches.forEach((_, i) => {
      const dx = two ? (i === 0 ? -0.2 : 0.2) : 0;
      for (const [cx, cy] of pieceCells(n.kind, 0, 0, 0)) {
        this.block(
          panel.x + 0.5 + cx + dx,
          panel.y + 0.8 + cy,
          COLOURS[n.kind]!,
          two ? 0.5 : 1,
          false,
        );
      }
    });
  }

  private layout(): void {
    if (!this.q) return;
    const portrait = this.scale.height > this.scale.width;
    this.at = arrangement(portrait);
    // Portrait: the game-pad sits below the well. Landscape: on both sides of it.
    const pad = ui().buttonBarHeight();
    fitCamera(this.cameras.main, this.scale, this.at.world, {
      top: px(ui().hudBottom() + 6),
      bottom: portrait ? px(pad + 6) : px(8),
      side: portrait || pad === 0 ? px(6) : px(200),
    });
  }
}
