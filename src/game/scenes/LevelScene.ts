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
import { Controls } from '../input/Controls';
import { GazeCone } from '../systems/GazeCone';
import { LevelSim } from '../systems/LevelSim';
import { ui } from '../ui';
import { newChshState, type ChshState } from '../ui/ChshPanel';
import { markCompleted } from '../ui/progress';

export interface LevelSceneData {
  levelId?: string;
  /** Skip the intro panel (used by "Try again"). */
  skipIntro?: boolean;
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
  private targetLabels: { text: Phaser.GameObjects.Text; col: number; row: number }[] = [];
  private controls!: Controls;
  private worldLayer!: Phaser.GameObjects.Layer;
  private uiLayer!: Phaser.GameObjects.Layer;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private running = false;

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
    this.sim = new LevelSim(this.level, mulberry32((Math.random() * 2 ** 32) >>> 0), transposed);
    this.running = false;
    this.quantum = [];
    this.targetLabels = [];

    this.worldLayer = this.add.layer();
    this.uiLayer = this.add.layer();
    this.drawMap();
    this.gaze = new GazeCone(this, this.worldLayer);
    this.drawObjects();
    this.quantum = this.sim.bodies.map((b) => new QuantumObject(this, this.worldLayer, b));
    const [q0, q1] = this.sim.qubits.map((q) => ({
      x: (q.col + 0.5) * CELL,
      y: (q.row + 0.5) * CELL,
    }));
    this.thread = q0 && q1 ? new EntanglementThread(this, this.worldLayer, q0, q1) : null;
    this.qubits = this.sim.qubits.map((q) => new Qubit(this, this.worldLayer, q));
    this.chsh = this.level.winCondition.type === 'chsh' ? newChshState() : null;
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
    overlay.setTimer(this.sim.timeLeft);
    overlay.setGlasses(this.level.glasses ? this.sim.glasses : null);
    overlay.handlers = {
      menu: () => this.openMenu(),
      restart: () => this.restartLevel(true),
      info: () => {
        this.running = false;
        overlay.showLearnMore(this.level.effects, () => this.begin());
      },
      glasses: () => this.toggleGlasses(),
    };
    this.input.keyboard?.on('keydown-Q', this.toggleGlasses, this);

    if (data.showMenu) this.openMenu();
    else if (data.skipIntro || this.level === SANDBOX) this.begin();
    else
      overlay.showIntro(
        this.level,
        isTouchDevice(),
        () => this.begin(),
        () => this.openMenu(),
      );
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
  }

  private toggleGlasses(): void {
    if (!this.level.glasses || !this.running || ui().isScreenOpen) return;
    this.sim.toggleGlasses();
    ui().setGlasses(this.sim.glasses);
  }

  override update(time: number, deltaMs: number): void {
    const state = this.controls.read();
    if (this.running && !ui().isScreenOpen) {
      const dt = Math.min(deltaMs, 100) / 1000;
      const gaze = state.gaze ? this.cameras.main.getWorldPoint(state.gaze.x, state.gaze.y) : null;
      const events = this.sim.step(
        dt,
        state.move,
        gaze ? { x: gaze.x / CELL, y: gaze.y / CELL } : null,
      );
      for (const e of events) {
        if (e.type === 'collapsed') this.quantum[e.body]?.flash(e.site);
        else if (e.type === 'qubit-changed')
          this.qubits.find((q) => (q.def.side ?? 0) === e.side)?.flash();
        else if (e.type === 'won') this.onWon();
        else if (e.type === 'lost') this.onLost(e.reason);
      }
      ui().setTimer(this.sim.timeLeft);
    }
    this.renderSim(time);
    this.controls.draw();
  }

  private renderSim(time = 0): void {
    this.gaze.draw(
      this.sim.cone,
      this.sim.opaque,
      this.sim.glasses === 'X' ? COLORS.gazeX : COLORS.gaze,
    );
    this.player.render(this.sim.player, this.sim.cone !== null);
    for (const q of this.quantum) q.render(time);
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

  private onLost(reason: 'time' | 'wrong-colour'): void {
    this.running = false;
    ui().showLose(
      reason,
      () => this.restartLevel(true),
      () => this.openMenu(),
    );
  }

  private restartLevel(skipIntro: boolean): void {
    ui().closeScreen();
    this.scene.restart({ levelId: this.level.id, skipIntro });
  }

  private openMenu(): void {
    this.running = false;
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
      if (obj.role === 'quantum' || obj.role === 'qubit') continue;
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
    const { width, height } = this.scale;
    this.cameras.main.setSize(width, height);
    this.uiCamera.setSize(width, height);

    const hudTop = px(60);
    const portrait = height > width;
    // Portrait: map on top, thumbs below. Landscape: thumbs on the sides.
    const area = portrait
      ? { x: 0, y: hudTop, w: width, h: height * 0.7 - hudTop }
      : { x: width * 0.16, y: hudTop, w: width * 0.68, h: height - hudTop - px(8) };

    const { cols, rows } = this.sim.map;
    const mapW = cols * CELL;
    const mapH = rows * CELL;
    const zoom = Math.min(area.w / mapW, area.h / mapH) * 0.96;
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    // centerOn puts the map centre mid-viewport; shift it to the centre of the area.
    cam.centerOn(
      mapW / 2 - (area.x + area.w / 2 - width / 2) / zoom,
      mapH / 2 - (area.y + area.h / 2 - height / 2) / zoom,
    );
  }
}
