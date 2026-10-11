import Phaser from 'phaser';
import { levelById, nextLevel } from '../../levels';
import { SANDBOX } from '../../levels/sandbox';
import type { LevelDef } from '../../levels/types';
import { mulberry32 } from '../../quantum/rng';
import { CELL, COLORS, UI_FONT } from '../constants';
import { px } from '../display';
import { emojiTexture } from '../emoji';
import { BRICK_VARIANTS, brickTexture } from '../textures';
import { Player } from '../entities/Player';
import { QuantumObject } from '../entities/QuantumObject';
import { EntanglementThread, Qubit } from '../entities/Qubit';
import { CoreView, FlowerView, LampView } from '../entities/Extras';
import { inspectCell } from '../ui/inspect';
import { Controls } from '../input/Controls';
import type { Gaze } from '../input/types';
import { GazeCone } from '../systems/GazeCone';
import { LevelSim, SLITS, type LossReason, type SimEvent } from '../systems/LevelSim';
import { play } from '../audio';
import { ui } from '../ui';
import { newBombPanelState, type BombPanelState } from '../ui/BombPanel';
import { newChshState, type ChshState } from '../ui/ChshPanel';
import { markCompleted } from '../ui/progress';

export interface LevelSceneData {
  levelId?: string;
  /** Skip the intro panel (used by "Try again"). */
  skipIntro?: boolean;
  /**
   * Classical-mode opener (levels with `classicalIntro`): undefined = start
   * classical when entering the level; false = quantum (after switching).
   */
  classical?: boolean;
  /** Open the level menu on top (used at boot). */
  showMenu?: boolean;
}

const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

/**
 * Plays one LevelDef. All game rules live in LevelSim; this scene renders
 * it and connects input and the DOM overlay.
 *
 * Two cameras: the main one shows the world (zoomed to fit the map), the UI
 * camera draws the joystick at 1:1 screen pixels.
 */
export class LevelScene extends Phaser.Scene {
  private level!: LevelDef;
  private sim!: LevelSim;
  private player!: Player;
  private gaze!: GazeCone;
  private quantum: QuantumObject[] = [];
  private qubits: Qubit[] = [];
  private thread: EntanglementThread | null = null;
  private chsh: ChshState | null = null;
  private bombs: BombPanelState | null = null;
  /** Two-slit visuals: flight waves and the dots on the screen. */
  private flight!: Phaser.GameObjects.Graphics;
  private flights = new Map<number, { seen: { col: number; row: number } | null }>();
  private hitLayer!: Phaser.GameObjects.Layer;
  /** Hits per screen cell; the screen glows where particles pile up (the stripes). */
  private hitCounts = new Map<string, number>();
  private screenGlow!: Phaser.GameObjects.Graphics;
  private lampViews: LampView[] = [];
  private flowerViews: FlowerView[] = [];
  private coreViews: CoreView[] = [];
  private cameraCones: GazeCone[] = [];
  private darkness!: Phaser.GameObjects.Graphics;
  /** 🔍 mode: eyes closed, taps describe objects instead of looking. */
  private inspecting = false;
  private targetLabels: { text: Phaser.GameObjects.Text; col: number; row: number }[] = [];
  private controls!: Controls;
  private worldLayer!: Phaser.GameObjects.Layer;
  private uiLayer!: Phaser.GameObjects.Layer;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private running = false;
  /** Playing the classical-mode opener of this level. */
  private classical = false;
  private gazeAngle = 0;
  private lastGazeScreen: { x: number; y: number } | null = null;

  constructor() {
    super('Level');
  }

  create(data: LevelSceneData): void {
    this.level = (data.levelId && levelById(data.levelId)) || SANDBOX;
    // Wide levels are turned on their side on a portrait screen (and vice versa).
    const portrait = this.scale.height > this.scale.width;
    const rows = this.level.map.length;
    const cols = this.level.map[0]?.length ?? 0;
    const transposed = portrait ? cols > rows * 1.2 : rows > cols * 1.2;
    this.classical = Boolean(this.level.classicalIntro) && data.classical !== false;
    this.sim = new LevelSim(
      this.level,
      mulberry32((Math.random() * 2 ** 32) >>> 0),
      transposed,
      this.classical,
    );
    this.running = false;
    this.lastGazeScreen = null;
    this.quantum = [];
    this.targetLabels = [];

    this.worldLayer = this.add.layer();
    this.uiLayer = this.add.layer();
    this.drawMap();
    this.darkness = this.add.graphics();
    this.worldLayer.add(this.darkness);
    this.gaze = new GazeCone(this, this.worldLayer);
    this.drawObjects();
    this.lampViews = this.sim.lamps.map((l) => new LampView(this, this.worldLayer, l));
    this.flowerViews = this.sim.flowers.map((f) => new FlowerView(this, this.worldLayer, f));
    this.coreViews = this.sim.cores.map((c) => new CoreView(this, this.worldLayer, c));
    this.cameraCones = this.sim.cameras.map(() => new GazeCone(this, this.worldLayer));
    this.inspecting = false;
    this.quantum = this.sim.bodies.map((b) => new QuantumObject(this, this.worldLayer, b));
    const [q0, q1] = this.sim.qubits.map((q) => ({
      x: (q.col + 0.5) * CELL,
      y: (q.row + 0.5) * CELL,
    }));
    this.thread = q0 && q1 ? new EntanglementThread(this, this.worldLayer, q0, q1) : null;
    this.qubits = this.sim.qubits.map((q) => new Qubit(this, this.worldLayer, q));
    this.chsh = this.level.winCondition.type === 'chsh' ? newChshState() : null;
    this.bombs = this.level.winCondition.type === 'bombs' ? newBombPanelState(this.level) : null;
    this.flights = new Map();
    this.hitCounts = new Map();
    this.screenGlow = this.add.graphics();
    this.worldLayer.add(this.screenGlow);
    this.hitLayer = this.add.layer();
    this.worldLayer.add(this.hitLayer);
    this.flight = this.add.graphics();
    this.worldLayer.add(this.flight);
    this.player = new Player(this, this.worldLayer);
    this.controls = new Controls(this, this.uiLayer);

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.ignore(this.uiLayer);
    this.uiCamera.ignore(this.worldLayer);
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.layout();
    this.renderSim();

    const overlay = ui();
    overlay.closeScreen();
    overlay.setHud(this.level);
    // The HUD is now visible: lay the map out below its real height right away.
    this.layout();
    overlay.setTimer(this.sim.timeLeft);
    overlay.setGlasses(this.level.glasses ? this.sim.glasses : null);
    overlay.setFocus(this.level.focus ? this.sim.focus : null);
    overlay.setInspectMode(false);
    overlay.handlers = {
      menu: () => this.openMenu(),
      restart: () => this.restartLevel(true),
      info: () => {
        this.running = false;
        overlay.showLearnMore(this.level.effects, () => this.begin());
      },
      glasses: () => this.toggleGlasses(),
      focus: (v) => this.sim.setFocus(v),
      inspect: () => this.toggleInspect(),
      hudResized: () => this.layout(),
    };
    this.input.keyboard?.on('keydown-Q', this.toggleGlasses, this);
    this.input.keyboard?.on('keydown-I', this.toggleInspect, this);
    // Mouse wheel: up sharpens the look, down blurs it.
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (!this.level.focus || ui().isScreenOpen) return;
      this.sim.setFocus(this.sim.focus - dy * 0.001);
      ui().setFocus(this.sim.focus);
    });
    this.input.on('pointerup', this.onTap, this);

    overlay.setClassicalBanner(this.classical ? () => this.switchToQuantum() : null);
    if (this.classical) {
      // Give the player a moment to try (and fail) before offering the switch.
      this.time.delayedCall(6000, () => ui().revealQuantumSwitch());
    }

    if (data.showMenu) this.openMenu();
    else if (data.skipIntro || this.level === SANDBOX) this.begin();
    else
      overlay.showIntro(
        this.level,
        isTouchDevice(),
        () => this.begin(),
        () => this.openMenu(),
        this.classical,
      );
  }

  private switchToQuantum(): void {
    ui().closeScreen();
    this.scene.restart({ levelId: this.level.id, classical: false });
  }

  /** Starts (or resumes) play; the CHSH level is played in its panel. */
  private begin(): void {
    this.running = true;
    if (this.chsh) {
      ui().showChsh(this.level, this.chsh, {
        pass: () => this.onWon(),
        menu: () => this.openMenu(),
      });
    }
    if (this.bombs) {
      ui().showBombs(this.level, this.bombs, {
        won: () => this.onWon(),
        lost: () => this.onLost('exploded'),
        menu: () => this.openMenu(),
      });
    }
  }

  private toggleInspect(): void {
    if (ui().isScreenOpen) return;
    this.inspecting = !this.inspecting;
    this.controls.touch.inspecting = this.inspecting;
    ui().setInspectMode(this.inspecting);
  }

  /** A short tap or click on the world: in 🔍 mode (or with a mouse) describe what is there. */
  private onTap(pointer: Phaser.Input.Pointer): void {
    if (ui().isScreenOpen || !this.running) return;
    const quick = pointer.getDuration() < 300 && pointer.getDistance() < px(12);
    if (!quick || (!this.inspecting && pointer.wasTouch)) return;
    if (!this.inspecting && pointer.rightButtonReleased()) return;
    const w = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const info = inspectCell(this.sim, Math.floor(w.x / CELL), Math.floor(w.y / CELL));
    if (info) ui().showInspect(info, () => {});
  }

  /** Expanding ring on a cell, for lamps, flowers and detector clicks. */
  private flashAt(col: number, row: number, colour: number = COLORS.collapse): void {
    const ring = this.add
      .circle((col + 0.5) * CELL, (row + 0.5) * CELL, CELL * 0.3)
      .setStrokeStyle(4, colour, 1);
    this.worldLayer.add(ring);
    this.tweens.add({
      targets: ring,
      scale: 2.6,
      alpha: 0,
      duration: 450,
      onComplete: () => ring.destroy(),
    });
  }

  private onSimEvent(e: SimEvent, wasEntangled: boolean): void {
    switch (e.type) {
      case 'collapsed':
        this.quantum[e.body]?.flash(e.site);
        play('collapse');
        break;
      case 'qubit-changed':
        this.qubits.find((q) => (q.def.side ?? 0) === e.side)?.flash();
        play(wasEntangled && !this.sim.pair?.entangled ? 'snap' : 'flash');
        break;
      case 'flash':
        this.flashAt(e.col, e.row);
        play('flash');
        break;
      case 'particle-passed':
        this.flights.set(e.id, { seen: e.seen });
        if (e.seen) {
          this.flashAt(e.seen.col, e.seen.row, COLORS.gaze);
          play('flash');
        }
        break;
      case 'particle-hit':
        this.onParticleHit(e.col, e.row, e.lamp);
        play(e.lamp ? 'lamp' : 'hit');
        break;
      case 'detector':
        this.flashAt(e.col, e.row, e.inZone ? COLORS.good : COLORS.bad);
        play('tick');
        break;
      case 'lights-out':
        play('snap');
        break;
      case 'won':
        this.onWon();
        break;
      case 'lost':
        this.onLost(e.reason);
        break;
      default:
        break;
    }
  }

  /** A dot where a particle landed; the lamp flashes when hit. */
  private onParticleHit(col: number, row: number, lamp: boolean): void {
    const jitter = () => (Math.random() - 0.5) * CELL * 0.7;
    const dot = this.add.circle(
      (col + 0.5) * CELL + jitter(),
      (row + 0.5) * CELL + jitter(),
      5,
      COLORS.gaze,
      0.9,
    );
    this.hitLayer.add(dot);
    const key = `${col},${row}`;
    this.hitCounts.set(key, (this.hitCounts.get(key) ?? 0) + 1);
    const max = Math.max(...this.hitCounts.values());
    const g = this.screenGlow;
    g.clear();
    for (const [k, n] of this.hitCounts) {
      const [c, r] = k.split(',').map(Number) as [number, number];
      g.fillStyle(COLORS.gaze, 0.45 * (n / max));
      g.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
    if (lamp) this.flashAt(col, row, COLORS.gaze);
  }

  /**
   * Particles in flight, drawn as a wave: rings from the torch, then from both
   * slits — or from just one, if its path was seen.
   */
  private drawFlights(): void {
    const g = this.flight;
    g.clear();
    const { source, slits } = this.sim;
    if (!source) return;
    // The wave travels from the torch towards the slits and on to the screen.
    const mid = {
      x: slits.reduce((a, b) => a + b.col, 0) / Math.max(1, slits.length),
      y: slits.reduce((a, b) => a + b.row, 0) / Math.max(1, slits.length),
    };
    const dir = Math.atan2(mid.y - source.row, mid.x - source.col);
    const SPREAD = (70 * Math.PI) / 180;
    for (const p of this.sim.particles) {
      const known = this.flights.get(p.id);
      const ring = (c: { col: number; row: number }, r: number, alpha: number) => {
        g.lineStyle(3, COLORS.ghostHeat, alpha);
        g.beginPath();
        g.arc((c.col + 0.5) * CELL, (c.row + 0.5) * CELL, r, dir - SPREAD, dir + SPREAD);
        g.strokePath();
      };
      if (p.age < SLITS.passage) {
        const reach = Math.hypot(mid.x - source.col, mid.y - source.row) * CELL;
        ring(source, (p.age / SLITS.passage) * reach, 0.6);
      } else {
        const t = (p.age - SLITS.passage) / (SLITS.flight - SLITS.passage);
        const screen = this.sim.screen[0];
        const reach = screen
          ? Math.abs(Math.cos(dir) * (screen.col - mid.x) + Math.sin(dir) * (screen.row - mid.y)) *
            CELL
          : 10 * CELL;
        const from = known?.seen ? [known.seen] : slits;
        for (const sl of from) ring(sl, t * reach, 0.6 * (1 - t) + 0.2);
      }
    }
  }

  /** HUD status: countdown, or the phases of the dark-ring level. */
  private status(): number | string | null {
    const cond = this.level.winCondition;
    if (cond.type === 'light-lamp') {
      return `💡 ${this.sim.lampHits}/${cond.hits} · ${Math.ceil(this.sim.timeLeft ?? 0)}`;
    }
    if (cond.type !== 'zone-after-dark') return this.sim.timeLeft;
    const round = `${this.sim.roundsDone + 1}/${cond.rounds}`;
    if (this.sim.phase === 'dark') return `${round} 🌑 ${Math.ceil(this.sim.darkLeft)}`;
    return `${round} 👁️ ${Math.min(this.sim.watched, cond.look).toFixed(1)}/${cond.look}`;
  }

  private toggleGlasses(): void {
    if (!this.level.glasses || !this.running || ui().isScreenOpen) return;
    this.sim.toggleGlasses();
    ui().setGlasses(this.sim.glasses);
  }

  override update(time: number, deltaMs: number): void {
    const state = this.controls.read(Math.min(deltaMs, 100) / 1000, this.gazeAngle);
    if (this.running && !ui().isScreenOpen) {
      const dt = Math.min(deltaMs, 100) / 1000;
      const gaze = this.inspecting ? null : this.gazeTarget(state.gaze);
      const events = this.sim.step(dt, state.move, gaze);
      const wasEntangled = this.sim.pair?.entangled ?? false;
      for (const e of events) this.onSimEvent(e, wasEntangled);
      ui().setTimer(this.status());
    }
    this.renderSim(time);
    this.controls.draw();
  }

  /**
   * Turns the control gaze into a point to look at (cell units). A stick or
   * Shift+arrows give a direction directly. The mouse gives a screen point,
   * but walking does not turn the gaze: the angle is only recomputed when the
   * mouse itself moves.
   */
  private gazeTarget(gaze: Gaze | null): { x: number; y: number } | null {
    if (!gaze) {
      this.lastGazeScreen = null;
      return null;
    }
    const p = this.sim.player;
    if (gaze.kind === 'angle') {
      this.gazeAngle = gaze.angle;
      this.lastGazeScreen = null;
    } else {
      const last = this.lastGazeScreen;
      if (!last || Math.hypot(gaze.x - last.x, gaze.y - last.y) > 0.5) {
        const w = this.cameras.main.getWorldPoint(gaze.x, gaze.y);
        this.gazeAngle = Math.atan2(w.y / CELL - p.y, w.x / CELL - p.x);
        this.lastGazeScreen = { x: gaze.x, y: gaze.y };
      }
    }
    return { x: p.x + Math.cos(this.gazeAngle), y: p.y + Math.sin(this.gazeAngle) };
  }

  private renderSim(time = 0): void {
    this.gaze.draw(
      this.sim.cone,
      this.sim.opaque,
      this.sim.glasses === 'X' ? COLORS.gazeX : COLORS.gaze,
    );
    this.player.render(this.sim.player, this.sim.cone !== null);
    for (const q of this.quantum) q.render(time);
    for (const l of this.lampViews) l.render(this.sim.glasses, time);
    for (const f of this.flowerViews) f.render();
    for (const c of this.coreViews) c.render();
    this.drawFlights();
    this.sim.cameras.forEach((cam, i) =>
      this.cameraCones[i]?.draw(
        cam.cone,
        this.sim.opaque,
        this.sim.camerasOn ? COLORS.camera : COLORS.cameraOff,
        this.sim.camerasOn ? 1 : 0.5,
      ),
    );
    this.darkness.clear();
    if (this.sim.phase === 'dark') {
      // Lights out: the room goes dark, but the ghosts stay visible to you, the player.
      const { cols, rows } = this.sim.map;
      this.darkness.fillStyle(0x000000, 0.7);
      this.darkness.fillRect(0, 0, cols * CELL, rows * CELL);
    }
    const { pair } = this.sim;
    if (pair) {
      this.thread?.render(pair, time);
      for (const q of this.qubits) q.render(pair, time);
    }
    // Chance of finding the cat on each target, while it is spread out.
    const body = this.sim.bodies[0];
    for (const label of this.targetLabels) {
      const spread = body !== undefined && body.psi.definiteSite() < 0;
      const site = body?.psi.lattice.siteAt(label.col, label.row) ?? -1;
      label.text.setVisible(spread && site >= 0);
      if (spread && site >= 0)
        label.text.setText(`${Math.round(body.psi.probability(site) * 100)}%`);
    }
  }

  private onWon(): void {
    this.running = false;
    play('win');
    if (this.level !== SANDBOX) markCompleted(this.level.id);
    const next = nextLevel(this.level.id);
    // Let the player see the flash, or the CHSH result, before the panel.
    const delay = this.level.winCondition.type === 'chsh' ? 1800 : 700;
    this.time.delayedCall(delay, () =>
      ui().showWin(this.level, next, {
        next: () => next && this.scene.restart({ levelId: next.id }),
        replay: () => this.restartLevel(true),
        menu: () => this.openMenu(),
      }),
    );
  }

  private onLost(reason: LossReason): void {
    this.running = false;
    play(reason === 'core' || reason === 'exploded' ? 'boom' : 'lose');
    ui().showLose(
      reason,
      () => this.restartLevel(true),
      () => this.openMenu(),
    );
  }

  private restartLevel(skipIntro: boolean): void {
    ui().closeScreen();
    this.scene.restart({ levelId: this.level.id, skipIntro, classical: this.classical });
  }

  private openMenu(): void {
    this.running = false;
    ui().setClassicalBanner(null);
    ui().showMenu((id) => this.scene.restart({ levelId: id }));
  }

  private drawMap(): void {
    const g = this.add.graphics();
    this.worldLayer.add(g);
    const { map } = this.sim;
    for (let row = 0; row < map.rows; row++) {
      for (let col = 0; col < map.cols; col++) {
        const x = col * CELL;
        const y = row * CELL;
        const tile = map.tiles[row]![col]!;
        if (tile === 'wall') {
          this.worldLayer.add(
            this.add
              .image(
                x + CELL / 2,
                y + CELL / 2,
                brickTexture(this, (col * 7 + row * 3) % BRICK_VARIANTS),
              )
              .setDisplaySize(CELL, CELL),
          );
        } else if (tile === 'barrier') {
          // A force field: violet, with ripples.
          g.fillStyle(COLORS.barrier, 0.45);
          g.fillRect(x, y, CELL, CELL);
          g.lineStyle(2, COLORS.barrier, 0.9);
          for (let k = 1; k <= 3; k++) {
            const yy = y + (k * CELL) / 4;
            g.beginPath();
            g.moveTo(x, yy);
            for (let t = 0; t <= 8; t++) {
              g.lineTo(x + (t * CELL) / 8, yy + Math.sin(t * 1.6 + k) * 3);
            }
            g.strokePath();
          }
        } else if (tile === 'glass') {
          g.fillStyle(COLORS.glass, 0.12);
          g.fillRect(x, y, CELL, CELL);
          g.lineStyle(3, COLORS.glass, 0.6);
          g.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
          g.lineStyle(2, COLORS.glass, 0.4);
          g.lineBetween(x + 14, y + CELL - 14, x + CELL - 14, y + 14);
        } else {
          g.fillStyle(COLORS.floor, 1);
          g.fillRect(x, y, CELL, CELL);
          g.lineStyle(1, COLORS.floorLine, 1);
          g.strokeRect(x, y, CELL, CELL);
        }
      }
    }
  }

  private drawObjects(): void {
    for (const obj of this.sim.map.objects) {
      if (obj.role === 'zone' || obj.char === 'A') {
        const g = this.add.graphics();
        g.fillStyle(COLORS.zone, 0.16);
        g.fillRect(obj.col * CELL + 1, obj.row * CELL + 1, CELL - 2, CELL - 2);
        this.worldLayer.add(g);
        continue;
      }
      if (obj.role === 'screen' || obj.role === 'slit') {
        const g = this.add.graphics();
        g.fillStyle(
          obj.role === 'screen' ? 0x05060c : COLORS.gaze,
          obj.role === 'screen' ? 0.9 : 0.12,
        );
        g.fillRect(obj.col * CELL, obj.row * CELL, CELL, CELL);
        this.worldLayer.add(g);
        if (!obj.lamp) continue;
      }
      if (obj.role === 'hot' || obj.role === 'cold') {
        const g = this.add.graphics();
        g.fillStyle(obj.role === 'hot' ? COLORS.hot : COLORS.cold, 0.22);
        g.fillRect(obj.col * CELL + 1, obj.row * CELL + 1, CELL - 2, CELL - 2);
        this.worldLayer.add(g);
        this.worldLayer.add(
          this.add
            .image((obj.col + 0.5) * CELL, (obj.row + 0.5) * CELL, emojiTexture(this, obj.emoji))
            .setDisplaySize(CELL * 0.45, CELL * 0.45)
            .setAlpha(0.6),
        );
        continue;
      }
      if (['quantum', 'qubit', 'lamp', 'flower', 'core'].includes(obj.role)) continue;
      const x = (obj.col + 0.5) * CELL;
      const y = (obj.row + 0.5) * CELL;
      if (obj.role === 'target') {
        const g = this.add.graphics();
        g.lineStyle(3, COLORS.target, 0.7);
        g.strokeRoundedRect(x - CELL / 2 + 4, y - CELL / 2 + 4, CELL - 8, CELL - 8, 8);
        this.worldLayer.add(g);
      }
      this.worldLayer.add(
        this.add
          .image(x, y, emojiTexture(this, obj.emoji))
          .setDisplaySize(CELL * 0.8, CELL * 0.8)
          .setAlpha(obj.role === 'target' ? 0.55 : 1),
      );
      if (obj.role === 'target') {
        const text = this.add
          .text(x, y - CELL * 0.62, '', {
            fontFamily: UI_FONT,
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffcf7a',
            stroke: '#0b0e1a',
            strokeThickness: 4,
          })
          .setOrigin(0.5, 0.5)
          .setResolution(3)
          .setVisible(false);
        this.worldLayer.add(text);
        this.targetLabels.push({ text, col: obj.col, row: obj.row });
      }
    }
  }

  /** Fits the map into the screen, leaving room for the HUD and the thumbs. */
  private layout(): void {
    if (!this.sim || !this.uiCamera) return;
    const { width, height } = this.scale;
    this.cameras.main.setSize(width, height);
    this.uiCamera.setSize(width, height);

    // Below the HUD (its height depends on how its buttons wrap).
    const hudTop = px(ui().hudBottom() + 6);
    const portrait = height > width;
    // Portrait: map on top, thumbs below. Landscape: thumbs on the sides.
    const area = portrait
      ? { x: 0, y: hudTop, w: width, h: height - hudTop - px(this.level.focus ? 230 : 160) }
      : {
          x: width * 0.16,
          y: hudTop,
          w: width * 0.68,
          h: height - hudTop - px(this.level.focus ? 80 : 8),
        };

    const { cols, rows } = this.sim.map;
    const mapW = cols * CELL;
    const mapH = rows * CELL;
    const view = this.level.view;
    const zoom =
      Math.min(
        area.w / (view ? Math.min(cols, view.cols) * CELL : mapW),
        area.h / (view ? Math.min(rows, view.rows) * CELL : mapH),
      ) * 0.96;
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    // centerOn puts the map centre mid-viewport; shift it to the centre of the area.
    cam.centerOn(
      mapW / 2 - (area.x + area.w / 2 - width / 2) / zoom,
      mapH / 2 - (area.y + area.h / 2 - height / 2) / zoom,
    );
  }
}
