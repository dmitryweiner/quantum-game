import type Phaser from 'phaser';
import { COLORS } from '../constants';
import { px } from '../display';
import type { Vec2 } from '../systems/movement';
import { clampToRadius, joystickVector } from './joystick';

const BASE_RADIUS = px(56);
const KNOB_RADIUS = px(24);
const DEAD_ZONE = px(6);
const MARGIN = px(28);

/**
 * Two-thumb touch scheme (PLAN.md §4.3):
 * - a floating joystick that appears where the left thumb lands;
 * - the right thumb points the gaze; lifting it closes the eyes.
 *
 * Each role is bound to one pointer id, so both thumbs work independently.
 */
export class TouchControls {
  private joystickId: number | null = null;
  private gazeId: number | null = null;
  private origin: Vec2 = { x: 0, y: 0 };
  private thumb: Vec2 = { x: 0, y: 0 };
  private gazePoint: Vec2 | null = null;
  private readonly gfx: Phaser.GameObjects.Graphics;
  /** Becomes true on the first touch; desktop users never see the joystick. */
  used = false;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    this.gfx = scene.add.graphics();
    layer.add(this.gfx);

    const input = scene.input;
    input.on('pointerdown', this.onDown, this);
    input.on('pointermove', this.onMove, this);
    input.on('pointerup', this.onUp, this);
    input.on('pointerupoutside', this.onUp, this);
    scene.events.once('shutdown', () => {
      input.off('pointerdown', this.onDown, this);
      input.off('pointermove', this.onMove, this);
      input.off('pointerup', this.onUp, this);
      input.off('pointerupoutside', this.onUp, this);
    });
  }

  get move(): Vec2 {
    if (this.joystickId === null) return { x: 0, y: 0 };
    return joystickVector(
      this.thumb.x - this.origin.x,
      this.thumb.y - this.origin.y,
      BASE_RADIUS,
      DEAD_ZONE,
    );
  }

  get gaze(): Vec2 | null {
    return this.gazePoint;
  }

  private idleOrigin(): Vec2 {
    return { x: MARGIN + BASE_RADIUS, y: this.scene.scale.height - MARGIN - BASE_RADIUS };
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) return;
    this.used = true;
    const leftHalf = pointer.x < this.scene.scale.width / 2;
    if (leftHalf && this.joystickId === null) {
      this.joystickId = pointer.id;
      this.origin = { x: pointer.x, y: pointer.y };
      this.thumb = { ...this.origin };
    } else if (!leftHalf && this.gazeId === null) {
      this.gazeId = pointer.id;
      this.gazePoint = { x: pointer.x, y: pointer.y };
    }
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickId) this.thumb = { x: pointer.x, y: pointer.y };
    else if (pointer.id === this.gazeId) this.gazePoint = { x: pointer.x, y: pointer.y };
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickId) this.joystickId = null;
    if (pointer.id === this.gazeId) {
      this.gazeId = null;
      this.gazePoint = null;
    }
  }

  /** Redraws the joystick; call once per frame. */
  draw(): void {
    const g = this.gfx;
    g.clear();
    if (!this.used) return;

    const active = this.joystickId !== null;
    const origin = active ? this.origin : this.idleOrigin();
    const knob = active
      ? clampToRadius(this.thumb.x - origin.x, this.thumb.y - origin.y, BASE_RADIUS)
      : { x: 0, y: 0 };

    g.fillStyle(COLORS.joystickBase, active ? 0.12 : 0.06);
    g.fillCircle(origin.x, origin.y, BASE_RADIUS);
    g.lineStyle(px(2), COLORS.joystickBase, active ? 0.35 : 0.18);
    g.strokeCircle(origin.x, origin.y, BASE_RADIUS);
    g.fillStyle(COLORS.joystickKnob, active ? 0.7 : 0.3);
    g.fillCircle(origin.x + knob.x, origin.y + knob.y, KNOB_RADIUS);
  }
}
