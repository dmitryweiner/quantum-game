import type Phaser from 'phaser';
import { COLORS } from '../constants';
import { px } from '../display';
import type { Vec2 } from '../systems/movement';
import { clampToRadius, joystickVector } from './joystick';

const BASE_RADIUS = px(56);
const KNOB_RADIUS = px(24);
const DEAD_ZONE = px(6);
/** The gaze stick only turns the look once the thumb moves this far. */
const AIM_ZONE = px(14);
const MARGIN = px(28);

interface Stick {
  id: number | null;
  origin: Vec2;
  thumb: Vec2;
}

/**
 * Twin-stick touch scheme (PLAN.md §4.3): the left thumb walks, the right
 * thumb looks. Pushing the right stick opens the eyes in that direction;
 * lifting the thumb closes them. Both sticks float: they appear where the
 * thumb lands in its half of the screen.
 *
 * In 🔍 mode (`inspecting`) touches are left alone, so a tap can pick an object.
 */
export class TouchControls {
  private readonly move: Stick = { id: null, origin: { x: 0, y: 0 }, thumb: { x: 0, y: 0 } };
  private readonly look: Stick = { id: null, origin: { x: 0, y: 0 }, thumb: { x: 0, y: 0 } };
  /** Last aimed direction; a fresh touch looks the same way until the thumb moves. */
  private angle = -Math.PI / 2;
  private readonly gfx: Phaser.GameObjects.Graphics;
  /** Becomes true on the first touch; desktop users never see the sticks. */
  used = false;
  inspecting = false;

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

  get moveVector(): Vec2 {
    const s = this.move;
    if (s.id === null) return { x: 0, y: 0 };
    return joystickVector(s.thumb.x - s.origin.x, s.thumb.y - s.origin.y, BASE_RADIUS, DEAD_ZONE);
  }

  /** Gaze direction while the right thumb is down, else null (eyes closed). */
  get gazeAngle(): number | null {
    const s = this.look;
    if (s.id === null) return null;
    const dx = s.thumb.x - s.origin.x;
    const dy = s.thumb.y - s.origin.y;
    if (Math.hypot(dx, dy) > AIM_ZONE) this.angle = Math.atan2(dy, dx);
    return this.angle;
  }

  private idle(right: boolean): Vec2 {
    const { width, height } = this.scene.scale;
    const y = height - MARGIN - BASE_RADIUS;
    return { x: right ? width - MARGIN - BASE_RADIUS : MARGIN + BASE_RADIUS, y };
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) return;
    this.used = true;
    if (this.inspecting) return;
    const stick = pointer.x < this.scene.scale.width / 2 ? this.move : this.look;
    if (stick.id !== null) return;
    stick.id = pointer.id;
    stick.origin = { x: pointer.x, y: pointer.y };
    stick.thumb = { ...stick.origin };
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    for (const s of [this.move, this.look]) {
      if (pointer.id === s.id) s.thumb = { x: pointer.x, y: pointer.y };
    }
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    for (const s of [this.move, this.look]) if (pointer.id === s.id) s.id = null;
  }

  /** Redraws both sticks; call once per frame. */
  draw(): void {
    const g = this.gfx;
    g.clear();
    if (!this.used || this.inspecting) return;
    this.drawStick(this.move, false, COLORS.joystickKnob);
    this.drawStick(this.look, true, COLORS.gaze);
  }

  private drawStick(s: Stick, right: boolean, knobColour: number): void {
    const g = this.gfx;
    const active = s.id !== null;
    const origin = active ? s.origin : this.idle(right);
    const knob = active
      ? clampToRadius(s.thumb.x - origin.x, s.thumb.y - origin.y, BASE_RADIUS)
      : { x: 0, y: 0 };
    g.fillStyle(COLORS.joystickBase, active ? 0.12 : 0.06);
    g.fillCircle(origin.x, origin.y, BASE_RADIUS);
    g.lineStyle(px(2), COLORS.joystickBase, active ? 0.35 : 0.18);
    g.strokeCircle(origin.x, origin.y, BASE_RADIUS);
    g.fillStyle(knobColour, active ? 0.7 : 0.3);
    g.fillCircle(origin.x + knob.x, origin.y + knob.y, KNOB_RADIUS);
    if (right) {
      // A little pupil on the gaze stick says "this one is for looking".
      g.fillStyle(0x0b0e1a, active ? 0.8 : 0.4);
      g.fillCircle(origin.x + knob.x, origin.y + knob.y, KNOB_RADIUS * 0.4);
    }
  }
}
