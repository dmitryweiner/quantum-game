import type Phaser from 'phaser';
import { KeyboardMouse } from './KeyboardMouse';
import { TouchControls } from './TouchControls';
import type { ControlState } from './types';

/** Merges touch and keyboard/mouse into one ControlState per frame. */
export class Controls {
  readonly touch: TouchControls;
  private readonly desktop: KeyboardMouse;

  constructor(scene: Phaser.Scene, uiLayer: Phaser.GameObjects.Layer) {
    // Two thumbs plus a spare: move stick, gaze stick, and an accidental palm.
    scene.input.addPointer(2);
    this.touch = new TouchControls(scene, uiLayer);
    this.desktop = new KeyboardMouse(scene);
  }

  read(): ControlState {
    const tm = this.touch.moveVector;
    const move = tm.x !== 0 || tm.y !== 0 ? tm : this.desktop.move;
    if (this.touch.used) {
      // Once the player has used touch, gaze follows the gaze stick only, so a
      // stray emulated mouse position does not keep the eyes open.
      const angle = this.touch.gazeAngle;
      return { move, gaze: angle === null ? null : { kind: 'angle', angle } };
    }
    return { move, gaze: this.desktop.gaze };
  }

  draw(): void {
    this.touch.draw();
  }
}
