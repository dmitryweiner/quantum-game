import Phaser from 'phaser';
import type { Vec2 } from '../systems/movement';
import type { Gaze } from './types';

type KeyName = 'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space' | 'shift';

/**
 * Desktop scheme: WASD / arrows to walk, mouse to look, Space or the right
 * button to close the eyes. Holding Shift looks with the keyboard instead:
 * the arrows turn the gaze (WASD still walk), releasing Shift closes the eyes.
 */
export class KeyboardMouse {
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key> | null;
  /** True once the mouse has moved over the canvas. */
  private mouseSeen = false;
  private mouseInside = true;
  /** Direction of the keyboard look (Shift + arrows). */
  private keyAngle = -Math.PI / 2;

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

  get gaze(): Gaze | null {
    const k = this.keys;
    if (k?.space.isDown) return null;
    if (k && this.shiftLook) {
      const x = (k.right.isDown ? 1 : 0) - (k.left.isDown ? 1 : 0);
      const y = (k.down.isDown ? 1 : 0) - (k.up.isDown ? 1 : 0);
      if (x !== 0 || y !== 0) this.keyAngle = Math.atan2(y, x);
      return { kind: 'angle', angle: this.keyAngle };
    }
    const mouse = this.scene.input.mousePointer;
    if (!mouse || !this.mouseSeen || !this.mouseInside) return null;
    if (mouse.rightButtonDown()) return null;
    return { kind: 'point', x: mouse.x, y: mouse.y };
  }
}
