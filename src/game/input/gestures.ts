/** Tunable numbers of the drag gestures, in cells and seconds. */
export const GESTURE = {
  /** Horizontal drag per one-cell shift: the piece follows the finger. */
  shiftStep: 0.6,
  /** Downward drag per one-row soft drop. */
  downStep: 1,
  /** Drag that decides the axis of a gesture (and is no longer a tap). */
  axisLock: 0.35,
  /** A tap: moved less than this and released within tapTime. */
  tapMove: 0.3,
  tapTime: 0.3,
  /** A flick down (hard drop): this fast at release, and at least flickMin long. */
  flickSpeed: 20,
  flickMin: 1.5,
  /** Window over which the release speed is measured. */
  flickWindow: 0.1,
} as const;

export interface GestureActions {
  shift(dx: -1 | 1): void;
  down(): void;
  drop(): void;
  /** A tap at (x, y), with one or two fingers. */
  tap(x: number, y: number, fingers: 1 | 2): void;
}

interface Sample {
  x: number;
  y: number;
  t: number;
}

/**
 * Touch gestures of a falling-blocks well, engine-free: drag sideways to
 * move (the piece follows the finger), drag down to soft-drop, flick down
 * to hard-drop, tap (or two-finger tap) to turn. Coordinates are in cells,
 * time in seconds. A gesture sticks to the axis it started along, so a
 * sideways drag never drops the piece by accident.
 */
export class DragGestures {
  private id: number | null = null;
  private start: Sample = { x: 0, y: 0, t: 0 };
  private anchor = { x: 0, y: 0 };
  private axis: 'x' | 'y' | null = null;
  private trail: Sample[] = [];
  private twoFingers = false;

  constructor(private readonly act: GestureActions) {}

  down(id: number, x: number, y: number, t: number): void {
    if (this.id !== null) {
      // A second finger while the first has not moved: a two-finger tap.
      if (this.axis === null) this.twoFingers = true;
      return;
    }
    this.id = id;
    this.start = { x, y, t };
    this.anchor = { x, y };
    this.axis = null;
    this.trail = [{ x, y, t }];
    this.twoFingers = false;
  }

  move(id: number, x: number, y: number, t: number): void {
    if (id !== this.id) return;
    this.trail.push({ x, y, t });
    while (this.trail.length > 2 && t - this.trail[0]!.t > GESTURE.flickWindow) this.trail.shift();
    if (this.axis === null) {
      const dx = Math.abs(x - this.start.x);
      const dy = y - this.start.y;
      if (Math.max(dx, Math.abs(dy)) < GESTURE.axisLock || this.twoFingers) return;
      this.axis = dx >= Math.abs(dy) ? 'x' : 'y';
    }
    if (this.axis === 'x') {
      while (x - this.anchor.x >= GESTURE.shiftStep) {
        this.anchor.x += GESTURE.shiftStep;
        this.act.shift(1);
      }
      while (this.anchor.x - x >= GESTURE.shiftStep) {
        this.anchor.x -= GESTURE.shiftStep;
        this.act.shift(-1);
      }
    } else {
      while (y - this.anchor.y >= GESTURE.downStep) {
        this.anchor.y += GESTURE.downStep;
        this.act.down();
      }
      // Dragging back up does nothing, but a new downward stretch starts from here.
      if (y < this.anchor.y) this.anchor.y = y;
    }
  }

  up(id: number, x: number, y: number, t: number): void {
    if (id !== this.id) return;
    this.move(id, x, y, t);
    this.id = null;
    const moved = Math.hypot(x - this.start.x, y - this.start.y);
    if (this.axis === null && moved < GESTURE.tapMove && t - this.start.t <= GESTURE.tapTime) {
      this.act.tap(this.start.x, this.start.y, this.twoFingers ? 2 : 1);
      return;
    }
    if (this.axis !== 'y') return;
    const first = this.trail[0]!;
    const speed = t > first.t ? (y - first.y) / (t - first.t) : 0;
    if (speed >= GESTURE.flickSpeed && y - this.start.y >= GESTURE.flickMin) this.act.drop();
  }

  cancel(): void {
    this.id = null;
  }
}
