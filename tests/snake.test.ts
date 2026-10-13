import { describe, expect, it } from 'vitest';
import { SNAKE_ARENA } from '../src/arcade/arenas';
import { SnakeGame, type Dir } from '../src/arcade/snake';
import { mulberry32 } from '../src/quantum/rng';

const OPEN = ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '#..@..#', '#######'];

/** Put the apple, definite, on a given cell. */
function placeApple(g: SnakeGame, col: number, row: number) {
  const psi = g.apples[0]!.psi;
  psi.collapseTo(psi.lattice.siteAt(col, row));
}

describe('quantum snake', () => {
  it('moves one cell per tick and dies on a wall', () => {
    const g = new SnakeGame(OPEN, mulberry32(1));
    const start = { ...g.head };
    g.update(g.tick + 1e-6);
    expect(g.head).toEqual({ col: start.col, row: start.row - 1 });
    for (let i = 0; i < 10 && g.alive; i++) g.update(g.tick);
    expect(g.alive).toBe(false);
  });

  it('ignores a U-turn', () => {
    const g = new SnakeGame(OPEN, mulberry32(1));
    g.turn('down');
    g.update(g.tick + 1e-6);
    expect(g.dir).toBe('up');
  });

  it('an apple in view stays put (Zeno); out of view it spreads', () => {
    const g = new SnakeGame(OPEN, mulberry32(2));
    placeApple(g, 3, 2); // straight ahead of the head at (3, 5)
    for (let i = 0; i < 30; i++) g.update(0.02);
    expect(g.apples[0]!.psi.definiteSite()).toBeGreaterThanOrEqual(0);

    const h = new SnakeGame(OPEN, mulberry32(3));
    placeApple(h, 1, 5); // beside the head, outside its forward cone
    for (let i = 0; i < 30; i++) h.update(0.02);
    expect(h.apples[0]!.psi.definiteSite()).toBe(-1);
  });

  it('eats an apple it is sure about and grows', () => {
    const g = new SnakeGame(OPEN, mulberry32(4));
    placeApple(g, 3, 4);
    const len = g.body.length;
    g.update(g.tick + 1e-6);
    expect(g.score).toBe(1);
    expect(g.body.length).toBe(len + 1);
  });

  it('entering a ghost cell is a measurement: sometimes the apple is not there', () => {
    let missed = 0;
    let ate = 0;
    for (let seed = 0; seed < 200; seed++) {
      const g = new SnakeGame(OPEN, mulberry32(seed));
      g.cone = null;
      const psi = g.apples[0]!.psi;
      // Half the apple in the cell ahead, half far away.
      psi.re.fill(0);
      psi.im.fill(0);
      psi.re[psi.lattice.siteAt(3, 4)] = Math.SQRT1_2;
      psi.re[psi.lattice.siteAt(1, 1)] = Math.SQRT1_2;
      // Step without letting the view measure first.
      (g as unknown as { acc: number }).acc = g.tick;
      (g as unknown as { step: (e: unknown[]) => void }).step([]);
      if (g.score > 0) ate++;
      else missed++;
    }
    expect(ate / 200).toBeGreaterThan(0.35);
    expect(missed / 200).toBeGreaterThan(0.35);
  });

  it('a simple bot that heads for the likeliest apple cell keeps eating', () => {
    let total = 0;
    for (let seed = 0; seed < 20; seed++) {
      const g = new SnakeGame(SNAKE_ARENA, mulberry32(seed));
      for (let t = 0; t < 60 / 0.02 && g.alive; t++) {
        const p = g.apples[0]!.psi;
        let best = 0;
        for (let i = 0; i < p.lattice.size; i++)
          if (p.probability(i) > p.probability(best)) best = i;
        const tc = p.lattice.col[best]!;
        const tr = p.lattice.row[best]!;
        const h = g.head;
        // Greedy, avoiding walls and itself.
        const options: Dir[] = [];
        if (tc > h.col) options.push('right');
        if (tc < h.col) options.push('left');
        if (tr > h.row) options.push('down');
        if (tr < h.row) options.push('up');
        options.push('up', 'left', 'right', 'down');
        const step = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
        const safe = options.find((d) => {
          const [dc, dr] = step[d];
          const c = h.col + dc;
          const r = h.row + dr;
          return (
            (SNAKE_ARENA[r]?.[c] ?? '#') !== '#' &&
            SNAKE_ARENA[r]?.[c] !== '%' &&
            !g.body.slice(0, -1).some((b) => b.col === c && b.row === r)
          );
        });
        if (safe) g.turn(safe);
        g.update(0.02);
      }
      total += g.score;
    }
    expect(total / 20).toBeGreaterThan(3);
  });

  it('with eyes closed an apple in front of the head spreads', () => {
    const g = new SnakeGame(OPEN, mulberry32(4));
    placeApple(g, 3, 2);
    g.setEyes(false);
    for (let i = 0; i < 30; i++) g.update(0.02);
    expect(g.cone).toBeNull();
    expect(g.apples[0]!.psi.definiteSite()).toBe(-1);
  });

  it('an apple frozen by the look is worth 1, a spread one more (S8)', () => {
    const g = new SnakeGame(OPEN, mulberry32(5));
    placeApple(g, 3, 4);
    const events = g.update(g.tick + 1e-6);
    expect(events.find((e) => e.type === 'ate')).toMatchObject({ points: 1 });

    // Blind, wait for the apple to spread; points of the apples caught by entering a cell.
    let best = 0;
    for (let s = 0; s < 200 && best < 2; s++) {
      const h = new SnakeGame(OPEN, mulberry32(100 + s));
      placeApple(h, 3, 3);
      h.setEyes(false);
      h.apples[0]!.psi.evolve(2.5);
      for (const e of h.update(h.tick * 2)) if (e.type === 'ate') best = Math.max(best, e.points);
    }
    expect(best).toBeGreaterThanOrEqual(2);
  });

  it('opening the eyes on a spread apple often finds it far from where it was (S1)', () => {
    let far = 0;
    for (let s = 0; s < 100; s++) {
      const g = new SnakeGame(SNAKE_ARENA, mulberry32(200 + s));
      // Eyes closed for a while: the apple spreads; then a look finds it.
      g.apples[0]!.psi.evolve(4);
      for (let i = 0; i < 5; i++) {
        for (const e of g.update(0.05))
          if (e.type === 'paradox' && e.paradox.kind === 'far') {
            far++;
            expect(Math.hypot(e.col - e.from.col, e.row - e.from.row)).toBeGreaterThanOrEqual(2.5);
          }
      }
    }
    expect(far).toBeGreaterThan(0);
  });
});
