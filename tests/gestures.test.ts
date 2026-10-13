import { describe, expect, it } from 'vitest';
import { DragGestures, GESTURE } from '../src/game/input/gestures';

function recorder() {
  const log: string[] = [];
  const g = new DragGestures({
    shift: (dx) => log.push(dx > 0 ? 'R' : 'L'),
    down: () => log.push('D'),
    drop: () => log.push('DROP'),
    tap: (_x, _y, fingers) => log.push(`TAP${fingers}`),
  });
  return { g, log };
}

/** Drags pointer 1 from (x0, y0) to (x1, y1) in `steps` moves over `time` seconds. */
function drag(g: DragGestures, x0: number, y0: number, x1: number, y1: number, time: number) {
  const steps = 20;
  g.down(1, x0, y0, 0);
  for (let i = 1; i <= steps; i++)
    g.move(1, x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, (time * i) / steps);
  g.up(1, x1, y1, time);
}

describe('DragGestures', () => {
  it('a short touch is a tap; with a second finger, a two-finger tap', () => {
    const { g, log } = recorder();
    g.down(1, 3, 4, 0);
    g.up(1, 3.1, 4, 0.1);
    g.down(1, 3, 4, 1);
    g.down(2, 6, 4, 1.02);
    g.up(2, 6, 4, 1.1);
    g.up(1, 3, 4, 1.12);
    expect(log).toEqual(['TAP1', 'TAP2']);
  });

  it('the piece follows a sideways drag, one cell per step', () => {
    const { g, log } = recorder();
    drag(g, 2, 5, 2 + GESTURE.shiftStep * 3 + 0.1, 5.2, 0.5);
    expect(log).toEqual(['R', 'R', 'R']);
    log.length = 0;
    drag(g, 5, 5, 5 - GESTURE.shiftStep * 2 - 0.1, 5, 0.5);
    expect(log).toEqual(['L', 'L']);
  });

  it('a sideways drag never soft-drops, even if the finger drifts down', () => {
    const { g, log } = recorder();
    drag(g, 2, 5, 6, 6.5, 0.6);
    expect(log.every((e) => e === 'R')).toBe(true);
  });

  it('a slow drag down soft-drops row by row and does not hard-drop', () => {
    const { g, log } = recorder();
    drag(g, 4, 2, 4, 6.2, 1.5);
    expect(log).toEqual(['D', 'D', 'D', 'D']);
  });

  it('a fast flick down hard-drops', () => {
    const { g, log } = recorder();
    drag(g, 4, 2, 4, 6, 0.12);
    expect(log.at(-1)).toBe('DROP');
  });

  it('a long slow drag that ends with a short twitch is not a flick', () => {
    const { g, log } = recorder();
    g.down(1, 4, 2, 0);
    g.move(1, 4, 5, 1);
    g.move(1, 4, 5.5, 1.08);
    g.up(1, 4, 5.5, 1.08);
    expect(log).not.toContain('DROP');
  });
});
