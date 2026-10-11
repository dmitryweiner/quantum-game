import Phaser from 'phaser';
import { SANDBOX_MAP } from '../../levels/sandbox';
import { isWall, parseMap, type ParsedMap } from '../../levels/map';
import { UI } from '../../strings/ui';
import { CELL, COLORS, UI_FONT } from '../constants';
import { px } from '../display';
import { emojiTexture } from '../emoji';
import { Player } from '../entities/Player';
import { Controls } from '../input/Controls';
import { GazeCone } from '../systems/GazeCone';

/**
 * M0 sandbox: a room with a walking observer and a gaze cone.
 *
 * Two cameras: the main one shows the world (zoomed to fit the map), the UI
 * camera draws HUD and joystick at 1:1 screen pixels.
 */
export class PlayScene extends Phaser.Scene {
  private map!: ParsedMap;
  private player!: Player;
  private gaze!: GazeCone;
  private controls!: Controls;
  private worldLayer!: Phaser.GameObjects.Layer;
  private uiLayer!: Phaser.GameObjects.Layer;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private help!: Phaser.GameObjects.Text;

  constructor() {
    super('Play');
  }

  create(): void {
    this.map = parseMap(SANDBOX_MAP);
    this.worldLayer = this.add.layer();
    this.uiLayer = this.add.layer();

    this.drawMap();
    this.gaze = new GazeCone(this, this.worldLayer);
    for (const obj of this.map.objects) {
      const img = this.add
        .image((obj.col + 0.5) * CELL, (obj.row + 0.5) * CELL, emojiTexture(this, obj.emoji))
        .setDisplaySize(CELL * 0.8, CELL * 0.8);
      this.worldLayer.add(img);
    }
    const start = this.map.playerStart;
    this.player = new Player(this, this.worldLayer, { x: start.col + 0.5, y: start.row + 0.5 });

    this.createHud();
    this.controls = new Controls(this, this.uiLayer);

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.ignore(this.uiLayer);
    this.uiCamera.ignore(this.worldLayer);

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.layout();
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 100) / 1000;
    const state = this.controls.read();

    this.player.update(dt, state.move, (c, r) => isWall(this.map, c, r));

    const target = state.gaze ? this.cameras.main.getWorldPoint(state.gaze.x, state.gaze.y) : null;
    this.gaze.draw(this.player.world, target);
    this.player.setEyesOpen(target !== null);

    if (this.controls.touch.used && this.help.text !== UI.helpTouch)
      this.help.setText(UI.helpTouch);
    this.controls.draw();
  }

  private drawMap(): void {
    const g = this.add.graphics();
    this.worldLayer.add(g);
    const wallKey = emojiTexture(this, '🧱');
    for (let row = 0; row < this.map.rows; row++) {
      for (let col = 0; col < this.map.cols; col++) {
        const x = col * CELL;
        const y = row * CELL;
        if (isWall(this.map, col, row)) {
          this.worldLayer.add(
            this.add.image(x + CELL / 2, y + CELL / 2, wallKey).setDisplaySize(CELL, CELL),
          );
        } else {
          g.fillStyle(COLORS.floor, 1);
          g.fillRect(x, y, CELL, CELL);
          g.lineStyle(1, COLORS.floorLine, 1);
          g.strokeRect(x, y, CELL, CELL);
        }
      }
    }
  }

  private createHud(): void {
    const title = this.add.text(px(16), px(12), `${UI.title} · ${UI.sandboxSubtitle}`, {
      fontFamily: UI_FONT,
      fontSize: `${px(16)}px`,
      color: '#e8ecff',
    });
    this.help = this.add.text(px(16), px(36), UI.helpDesktop, {
      fontFamily: UI_FONT,
      fontSize: `${px(12)}px`,
      color: '#8b93b8',
    });
    const build = this.add
      .text(0, 0, `build ${__BUILD__}`, {
        fontFamily: UI_FONT,
        fontSize: `${px(10)}px`,
        color: '#4a5277',
      })
      .setOrigin(1, 1)
      .setName('build');
    this.uiLayer.add([title, this.help, build]);
  }

  /** Fits the map into the screen, leaving room for the thumbs. */
  private layout(): void {
    const { width, height } = this.scale;
    this.cameras.main.setSize(width, height);
    this.uiCamera.setSize(width, height);

    this.help.setWordWrapWidth(width - px(32));
    const build = this.uiLayer.getByName('build') as Phaser.GameObjects.Text | null;
    build?.setPosition(width - px(8), height - px(6));

    const hudTop = px(56);
    const portrait = height > width;
    // Portrait: map on top, controls below. Landscape: thumbs on the sides.
    const area = portrait
      ? { x: 0, y: hudTop, w: width, h: height * 0.68 - hudTop }
      : { x: width * 0.16, y: hudTop, w: width * 0.68, h: height - hudTop - px(8) };

    const mapW = this.map.cols * CELL;
    const mapH = this.map.rows * CELL;
    const zoom = Math.min(area.w / mapW, area.h / mapH) * 0.96;
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    // centerOn puts the map centre in the middle of the viewport; shift it to the area centre.
    cam.centerOn(
      mapW / 2 - (area.x + area.w / 2 - width / 2) / zoom,
      mapH / 2 - (area.y + area.h / 2 - height / 2) / zoom,
    );
  }
}
