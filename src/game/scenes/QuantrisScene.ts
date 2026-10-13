import Phaser from 'phaser';
import { QUANTRIS, QuantrisGame, pieceCells, type QuantrisEvent } from '../../arcade/quantris';
import { mulberry32 } from '../../quantum/rng';
import type { EffectId } from '../../strings/effects';
import { T } from '../../strings/ui';
import { play } from '../audio';
import { CELL, COLORS, UI_FONT } from '../constants';
import { px } from '../display';
import { DragGestures } from '../input/gestures';
import { autoRepeat } from '../input/repeat';
import { openMainMenu, setHash } from '../menu';
import { fitCamera } from '../render/tiles';
import { ui } from '../ui';
import { bestScore } from '../ui/progress';
import { announce, finishArcade } from '../ui/shock';
import { ArcadeMode } from '../ui/arcadeMode';
import { ParadoxLog, SHOCK } from '../../arcade/paradox';

const EFFECTS: EffectId[] = [
  'superposition',
  'collapse',
  'born-rule',
  'entanglement',
  'zeno',
  'tunnelling',
];
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
/** One colour per tetromino (I O T S Z J L). */
const COLOURS = [0x5fd3ff, 0xffd166, 0xc77dff, 0x7bd88f, 0xff6b6b, 0x5a8dee, 0xffa552];
/** A short buzz where the device can (Android; iOS ignores it). */
const buzz = (ms: number) => navigator.vibrate?.(ms);
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

/**
 * Quantris (PLAN.md §9.3): renders QuantrisGame. Touch: gestures on the well
 * (drag, flick, tap) and a game-pad; desktop: keys with auto-repeat.
 */
export class QuantrisScene extends Phaser.Scene {
  private q!: QuantrisGame;
  private gfx!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  /** Grows the 🔗 for a moment when the entangled next piece settles. */
  private linkFlash = 0;
  private running = false;
  private at = arrangement(false);
  private nextLabel!: Phaser.GameObjects.Text;
  /** Chances of the next piece's two branches, and its 🔗 when it is entangled. */
  private nextOdds: Phaser.GameObjects.Text[] = [];
  private linkLabel!: Phaser.GameObjects.Text;
  /** Stoppers of the keys held down right now (auto-repeat). */
  private held = new Map<string, () => void>();
  private log = new ParadoxLog();
  private mode!: ArcadeMode;

  constructor() {
    super('Quantris');
  }

  create(): void {
    this.q = new QuantrisGame(mulberry32((Math.random() * 2 ** 32) >>> 0));
    this.log = new ParadoxLog();
    this.mode = new ArcadeMode('quantris', (on) => this.q.setClassical(on));
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

    const small = (size: number) => ({
      fontFamily: UI_FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#0b0e1a',
      strokeThickness: 4,
    });
    this.nextOdds = [0, 1].map(() =>
      this.add.text(0, 0, '', small(20)).setOrigin(0.5).setResolution(3),
    );
    this.linkLabel = this.add.text(0, 0, '🔗', small(26)).setOrigin(0.5).setResolution(3);

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
    overlay.setActionButton(null);
    overlay.setArcadePad(
      isTouchDevice()
        ? {
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
            up: { label: '⏬', aria: t.aria.drop, press: () => this.act(() => this.q.hardDrop()) },
            a: { label: '⟳', aria: t.aria.rotate, press: () => this.act(() => this.q.rotate(1)) },
            b: {
              label: '👁',
              aria: t.aria.look,
              press: () => this.act(() => this.q.hold(true)),
              release: () => this.q.hold(false),
            },
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
      this.releaseKeys();
    });
    this.layout();
    this.bindKeys();
    this.bindGestures();
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

  /** Runs a player action while the game is on, then reacts to what happened. */
  private act(fn: () => QuantrisEvent[]): void {
    if (!this.running || ui().isScreenOpen) return;
    this.onEvents(fn());
    this.render();
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    // Moves repeat with DAS/ARR (not the OS key repeat); the rest fire once per press.
    const repeating: Record<string, () => QuantrisEvent[]> = {
      ArrowLeft: () => this.q.move(-1),
      KeyA: () => this.q.move(-1),
      ArrowRight: () => this.q.move(1),
      KeyD: () => this.q.move(1),
      ArrowDown: () => this.q.softDrop(),
      KeyS: () => this.q.softDrop(),
    };
    const once: Record<string, () => QuantrisEvent[]> = {
      ArrowUp: () => this.q.rotate(1),
      KeyX: () => this.q.rotate(1),
      KeyW: () => this.q.rotate(1),
      KeyZ: () => this.q.rotate(-1),
      Space: () => this.q.hardDrop(),
      KeyL: () => this.q.hold(true),
      KeyE: () => this.q.hold(true),
    };
    kb.on('keydown', (e: KeyboardEvent) => {
      const fn = repeating[e.code] ?? once[e.code];
      if (!fn) return;
      e.preventDefault();
      if (e.repeat) return;
      if (repeating[e.code]) {
        this.held.get(e.code)?.();
        this.held.set(
          e.code,
          autoRepeat(() => this.act(fn)),
        );
      } else this.act(fn);
    });
    kb.on('keyup', (e: KeyboardEvent) => {
      if (e.code === 'KeyL' || e.code === 'KeyE') this.q.hold(false);
      this.held.get(e.code)?.();
      this.held.delete(e.code);
    });
    window.addEventListener('blur', this.releaseKeys);
    this.events.once('shutdown', () => window.removeEventListener('blur', this.releaseKeys));
  }

  private releaseKeys = (): void => {
    for (const stop of this.held.values()) stop();
    this.held.clear();
  };

  /** Gestures on the well: drag to move, drag down to soft-drop, flick to drop, tap to turn. */
  private bindGestures(): void {
    const gestures = new DragGestures({
      shift: (dx) => this.act(() => this.q.move(dx)),
      down: () => this.act(() => this.q.softDrop()),
      drop: () => this.act(() => this.q.hardDrop()),
      tap: (x, y, fingers) => this.act(() => this.tap(x, y, fingers)),
    });
    const at = (p: Phaser.Input.Pointer) => {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      return [w.x / CELL, w.y / CELL, performance.now() / 1000] as const;
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => gestures.down(p.id, ...at(p)));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) gestures.move(p.id, ...at(p));
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => gestures.up(p.id, ...at(p)));
    this.input.on('gameout', () => gestures.cancel());
  }

  /**
   * A tap at world cell (x, y): on a superposed piece — look at it; left of
   * the piece or with two fingers — turn counter-clockwise; else clockwise.
   */
  private tap(x: number, y: number, fingers: 1 | 2): QuantrisEvent[] {
    if (fingers === 2) return this.q.rotate(-1);
    const bx = x - this.at.board.x;
    const by = y - this.at.board.y;
    const { kind, y: py, branches } = this.q.piece;
    const cells = branches.flatMap((b) => pieceCells(kind, b.rot, b.x, py));
    const onPiece = cells.some(
      ([cx, cy]) => Math.abs(cx + 0.5 - bx) < 1 && Math.abs(cy + 0.5 - by) < 1,
    );
    if (onPiece && branches.length > 1) return this.q.look();
    if (bx < Math.min(...cells.map(([cx]) => cx))) return this.q.rotate(-1);
    return this.q.rotate(1);
  }

  private onEvents(events: QuantrisEvent[]): void {
    for (const e of events) {
      if (e.type === 'collapsed') {
        play('collapse');
        buzz(25);
        if (e.chance <= SHOCK.rareChance) announce(this.log, { kind: 'rare', value: e.chance });
      } else if (e.type === 'spooky') {
        this.linkFlash = 1;
        announce(this.log, { kind: 'spooky', value: e.distance });
      } else if (e.type === 'tunnelled') {
        announce(this.log, { kind: 'tunnel', value: e.rows });
      } else if (e.type === 'streak') {
        ui().toast(T().arcade.quantris.streak(e.count));
        play('chime');
      } else if (e.type === 'merged') play('snap');
      else if (e.type === 'locked') {
        play('hit');
        buzz(12);
      } else if (e.type === 'lines') {
        play('lamp');
        buzz(40);
      } else if (e.type === 'over') this.gameOver();
    }
    this.updateHud();
  }

  private updateHud(): void {
    const q = this.q;
    ui().setTimer(
      T().arcade.quantris.hud(
        q.score,
        q.lines,
        q.looks,
        Math.max(bestScore('quantris'), q.score),
        this.log.total,
      ),
    );
  }

  override update(_time: number, deltaMs: number): void {
    if (this.running && !ui().isScreenOpen) {
      const dt = Math.min(deltaMs, 100) / 1000;
      this.mode.update(dt);
      const events = this.q.update(dt);
      if (events.length) this.onEvents(events);
    }
    this.render();
  }

  private gameOver(): void {
    this.running = false;
    play('lose');
    const score = this.q.score;
    this.time.delayedCall(600, () =>
      finishArcade(
        'quantris',
        score,
        this.mode.mode,
        this.log,
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

    // The falling piece: each branch drawn as strong as its chance, with its landing shadow.
    const { kind, y, branches } = q.piece;
    const quantum = branches.length > 1;
    branches.forEach((b, i) => {
      let land = y;
      while (q.fits(kind, b.rot, b.x, land + 1)) land++;
      g.lineStyle(3, COLOURS[kind]!, 0.35);
      for (const [cx, cy] of pieceCells(kind, b.rot, b.x, land)) {
        g.strokeRoundedRect(bx + cx * CELL + 4, by + cy * CELL + 4, CELL - 8, CELL - 8, 8);
      }
      // Watched (👁 held): the piece glows and stands still.
      if (q.holding) {
        g.lineStyle(4, COLORS.gaze, 0.9);
        for (const [cx, cy] of pieceCells(kind, b.rot, b.x, y))
          if (cy >= 0)
            g.strokeRoundedRect(bx + cx * CELL + 1, by + cy * CELL + 1, CELL - 2, CELL - 2, 9);
      }
      // A definite piece over a thin overhang: where it may tunnel to, with the chance.
      const tunnel = quantum ? null : q.tunnelTarget(land);
      if (tunnel !== null) {
        g.lineStyle(3, COLORS.barrier, 0.8);
        const tc = pieceCells(kind, b.rot, b.x, tunnel);
        for (const [cx, cy] of tc)
          g.strokeRoundedRect(bx + cx * CELL + 6, by + cy * CELL + 6, CELL - 12, CELL - 12, 6);
        const top = tc.reduce((a, c) => (c[1] < a[1] ? c : a));
        this.labels[1]!.setVisible(true)
          .setText(`${Math.round(QUANTRIS.tunnelChance * 100)}%`)
          .setPosition(bx + (top[0] + 0.5) * CELL, by + (top[1] + 0.5) * CELL);
      }
      const cells = pieceCells(kind, b.rot, b.x, y);
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
    if (!quantum && q.tunnelTarget(this.landing()) === null) this.labels[1]!.setVisible(false);

    // Next piece.
    const { panel } = this.at;
    g.lineStyle(2, COLORS.floorLine, 1);
    g.strokeRoundedRect(panel.x * CELL, panel.y * CELL, 5 * CELL, 4 * CELL, 12);
    this.nextLabel.setPosition((panel.x + 2.5) * CELL, (panel.y - 0.35) * CELL);
    const n = q.next;
    const two = n.branches.length > 1;
    n.branches.forEach((b, i) => {
      const dx = two ? (i === 0 ? -0.2 : 0.2) : 0;
      for (const [cx, cy] of pieceCells(n.kind, b.rot, 0, 0)) {
        this.block(
          panel.x + 0.5 + cx + dx,
          panel.y + 0.4 + cy,
          COLOURS[n.kind]!,
          two ? 0.25 + 0.5 * b.p : 1,
          false,
        );
      }
    });
    // Its chances (they jump the instant an entangled current piece settles), and the 🔗.
    this.nextOdds.forEach((t, i) => {
      const b = n.branches[i];
      t.setVisible(two && !!b)
        .setText(b ? `${Math.round(b.p * 100)}%` : '')
        .setPosition((panel.x + (i === 0 ? 1 : 4)) * CELL, (panel.y + 3.55) * CELL);
    });
    this.linkFlash = Math.max(0, this.linkFlash - 0.03);
    this.linkLabel
      .setVisible(n.linked || this.linkFlash > 0)
      .setPosition((panel.x + 2.5) * CELL, (panel.y + 3.55) * CELL)
      .setScale(1 + this.linkFlash);
  }

  /** Where the definite falling piece would land. */
  private landing(): number {
    const { kind, y, branches } = this.q.piece;
    const b = branches[0]!;
    let land = y;
    while (this.q.fits(kind, b.rot, b.x, land + 1)) land++;
    return land;
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
