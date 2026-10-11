import Phaser from 'phaser';
import type { Vec2 } from '../systems/movement';
import type { Gaze } from './types';

type KeyName = 'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space' | 'shift';

/** Keyboard look turns this fast, radians per second. */
const TURN_RATE = (150 * Math.PI) / 180;

/**
 * Desktop scheme: WASD / arrows to walk, mouse to look, Space or the right
 * button to close the eyes. Holding Shift looks with the keyboard instead:
 * the eyes open where they last looked, ← and → turn the gaze smoothly (WASD
 * still walk). Releasing Shift hands the gaze back to the mouse, but the
 * keyboard angle stays until the mouse moves (or closes the eyes if the mouse
 * is not over the game).
 */
export class KeyboardMouse {
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key> | null;
  /** True once the mouse has moved over the canvas. */
  private mouseSeen = false;
  private mouseInside = true;
  /** Direction of the keyboard look (Shift + arrows). */
  private keyAngle = -Math.PI / 2;
  private wasShift = false;
  /**
   * After Shift is released the gaze keeps the keyboard angle until the mouse
   * actually moves (it must not snap back to wherever the cursor was).
   */
  private keepKeyAngle = false;
  private mouseAtRelease = { x: 0, y: 0 };

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb
      ? {
          up: kb.addKey(K.UP),
          down: kb.addKey(K.DOWN),
          left: kb.addKey(K.LEFT),
          right: kb.addKey(K.RIGHT),
          w: kb.addKey(K.W),
          a: kb.addKey(K.A),
          s: kb.addKey(K.S),
          d: kb.addKey(K.D),
          space: kb.addKey(K.SPACE),
          shift: kb.addKey(K.SHIFT),
        }
      : null;

    const input = scene.input;
    const onMove = (pointer: Phaser.Input.Pointer) => {
      if (pointer === input.mousePointer) this.mouseSeen = true;
    };
    const onOver = () => (this.mouseInside = true);
    const onOut = () => (this.mouseInside = false);
    input.on('pointermove', onMove);
    input.on('gameover', onOver);
    input.on('gameout', onOut);
    scene.events.once('shutdown', () => {
      input.off('pointermove', onMove);
      input.off('gameover', onOver);
      input.off('gameout', onOut);
    });
  }

  private get shiftLook(): boolean {
    return this.keys?.shift.isDown ?? false;
  }

  get move(): Vec2 {
    const k = this.keys;
    if (!k) return { x: 0, y: 0 };
    // With Shift held the arrows belong to the gaze.
    const arrows = !this.shiftLook;
    const right = k.d.isDown || (arrows && k.right.isDown);
    const left = k.a.isDown || (arrows && k.left.isDown);
    const down = k.s.isDown || (arrows && k.down.isDown);
    const up = k.w.isDown || (arrows && k.up.isDown);
    const x = (right ? 1 : 0) - (left ? 1 : 0);
    const y = (down ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  /**
   * @param dt seconds since the last frame (for turning)
   * @param current the direction the observer is looking now, to start from
   */
  gaze(dt: number, current: number): Gaze | null {
    const k = this.keys;
    const shift = this.shiftLook;
    const mouse = this.scene.input.mousePointer;
    if (shift && !this.wasShift) this.keyAngle = current;
    if (!shift && this.wasShift) {
      this.keepKeyAngle = true;
      this.mouseAtRelease = { x: mouse?.x ?? 0, y: mouse?.y ?? 0 };
    }
    this.wasShift = shift;
    if (k?.space.isDown) return null;
    if (k && shift) {
      const turn = (k.right.isDown ? 1 : 0) - (k.left.isDown ? 1 : 0);
      this.keyAngle += turn * TURN_RATE * dt;
      return { kind: 'angle', angle: this.keyAngle };
    }
    if (!mouse || !this.mouseSeen || !this.mouseInside) return null;
    if (mouse.rightButtonDown()) return null;
    if (this.keepKeyAngle) {
      const moved = Math.hypot(mouse.x - this.mouseAtRelease.x, mouse.y - this.mouseAtRelease.y);
      if (moved < 3) return { kind: 'angle', angle: this.keyAngle };
      this.keepKeyAngle = false;
    }
    return { kind: 'point', x: mouse.x, y: mouse.y };
  }
}
