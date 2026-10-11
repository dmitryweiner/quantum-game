import Phaser from 'phaser';
import type { Vec2 } from '../systems/movement';

/** Desktop scheme: WASD / arrows to move, mouse to look, Space or RMB to close eyes. */
export class KeyboardMouse {
  private readonly keys: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space',
    Phaser.Input.Keyboard.Key
  > | null;
  /** True once the mouse has moved over the canvas. */
  private mouseSeen = false;
  private mouseInside = true;

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

  get move(): Vec2 {
    const k = this.keys;
    if (!k) return { x: 0, y: 0 };
    const x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  get gaze(): Vec2 | null {
    const mouse = this.scene.input.mousePointer;
    if (!mouse || !this.mouseSeen || !this.mouseInside) return null;
    if (this.keys?.space.isDown || mouse.rightButtonDown()) return null;
    return { x: mouse.x, y: mouse.y };
  }
}
