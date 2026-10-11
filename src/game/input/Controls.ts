import type Phaser from 'phaser';
import { KeyboardMouse } from './KeyboardMouse';
import { TouchControls } from './TouchControls';
import type { ControlState } from './types';

/** Merges touch and keyboard/mouse into one ControlState per frame. */
export class Controls {
  readonly touch: TouchControls;
  private readonly desktop: KeyboardMouse;

  constructor(scene: Phaser.Scene, uiLayer: Phaser.GameObjects.Layer) {
    // Two thumbs plus a spare: joystick, gaze, and an accidental palm.
    scene.input.addPointer(2);
    this.touch = new TouchControls(scene, uiLayer);
    this.desktop = new KeyboardMouse(scene);
  }

  read(): ControlState {
    const tm = this.touch.move;
    const move = tm.x !== 0 || tm.y !== 0 ? tm : this.desktop.move;
    // Once the player has used touch, gaze follows touch only, so a stray
    // emulated mouse position does not keep the eyes open.
    const gaze = this.touch.used ? this.touch.gaze : this.desktop.gaze;
    return { move, gaze };
  }

  draw(): void {
    this.touch.draw();
  }
}
