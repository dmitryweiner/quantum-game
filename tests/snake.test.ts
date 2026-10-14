import { describe, expect, it } from 'vitest';
import { SNAKE_ARENA } from '../src/arcade/arenas';
import { SnakeGame, type Dir, type Fruit } from '../src/arcade/snake';
import { mulberry32 } from '../src/quantum/rng';

const OPEN = ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '#..@..#', '#######'];

/** The game's only fruit: an ordinary apple (whatever the game spawned first is replaced). */
function apple(g: SnakeGame) {
  const f = g.fruits[0];
  if (g.fruits.length === 1 && f?.kind === 'apple') return f;
  g.fruits = [];
  return (g as unknown as { addFruit: (k: string, at: object) => Fruit }).addFruit('apple', {
    col: 1,
    row: 1,
  });
}

/** Put the apple, definite, on a given cell. */
function placeApple(g: SnakeGame, col: number, row: number) {
  const psi = apple(g).psi;
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
    expect(apple(g).psi.definiteSite()).toBeGreaterThanOrEqual(0);

    const h = new SnakeGame(OPEN, mulberry32(3));
    placeApple(h, 1, 5); // beside the head, outside its forward cone
    for (let i = 0; i < 30; i++) h.update(0.02);
    expect(apple(h).psi.definiteSite()).toBe(-1);
  });

  it('eats an apple it is sure about and grows', () => {
    const g = new SnakeGame(OPEN, mulberry32(4));
    placeApple(g, 3, 4);
    const len = g.body.length;
    // Watched every frame on the way, it stays put (Zeno).
    for (let t = 0; t <= g.tick; t += 0.02) g.update(0.02);
    expect(g.score).toBe(1);
    expect(g.body.length).toBe(len + 1);
  });

  it('entering a ghost cell is a measurement: sometimes the apple is not there', () => {
    let missed = 0;
    let ate = 0;
    for (let seed = 0; seed < 200; seed++) {
      const g = new SnakeGame(OPEN, mulberry32(seed));
      g.cone = null;
      const psi = apple(g).psi;
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
        const p = g.fruits[0]!.psi;
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
    expect(apple(g).psi.definiteSite()).toBe(-1);
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
      apple(h).psi.evolve(2.5);
      for (const e of h.update(h.tick * 2)) if (e.type === 'ate') best = Math.max(best, e.points);
    }
    expect(best).toBeGreaterThanOrEqual(2);
  });

  it('opening the eyes on a spread apple often finds it far from where it was (S1)', () => {
    let far = 0;
    for (let s = 0; s < 100; s++) {
      const g = new SnakeGame(SNAKE_ARENA, mulberry32(200 + s));
      // Eyes closed for a while: the apple spreads; then a look finds it.
      apple(g).psi.evolve(4);
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

  it('classical mode: an unwatched apple stays where it is', () => {
    const g = new SnakeGame(OPEN, mulberry32(9));
    g.classical = true;
    g.setEyes(false);
    placeApple(g, 1, 1);
    for (let i = 0; i < 20; i++) g.update(0.02);
    expect(apple(g).psi.definiteSite()).toBe(apple(g).psi.lattice.siteAt(1, 1));
  });

  it('an apple held in view long enough is named as a Zeno freeze', () => {
    const g = new SnakeGame(OPEN, mulberry32(11));
    placeApple(g, 3, 1);
    // The head would reach it; keep it from moving by never letting a step happen.
    let zeno = false;
    for (let i = 0; i < 160 && !zeno; i++) {
      (g as unknown as { acc: number }).acc = 0;
      for (const e of g.update(0.02))
        if (e.type === 'paradox' && e.paradox.kind === 'zeno') zeno = true;
    }
    expect(zeno).toBe(true);
  });

  /** A game with exactly these fruits (an entangled pair if both 'apple' and 'green'). */
  function withFruits(seed: number, fruits: [string, number, number][], arena = SNAKE_ARENA) {
    const g = new SnakeGame(arena, mulberry32(seed));
    g.fruits = [];
    const add = (g as unknown as { addFruit: (k: string, at: object) => Fruit }).addFruit.bind(g);
    const made = fruits.map(([k, col, row]) => add(k, { col, row }));
    if (made.length === 2) {
      made[0]!.partner = made[1]!.id;
      made[1]!.partner = made[0]!.id;
    }
    return { g, made };
  }

  it('finding one of the entangled 🍎🍏 settles the other at the mirror cell at once', () => {
    let checked = 0;
    for (let s = 0; s < 30; s++) {
      const { g, made } = withFruits(400 + s, [
        ['apple', 5, 9],
        ['green', 7, 9],
      ]);
      const [a, b] = made as [Fruit, Fruit];
      // Spread unseen first; then the head (at 6,12, looking up) sees the pair.
      g.setEyes(false);
      a.psi.evolve(1.5);
      g.update(0.01);
      g.setEyes(true);
      let spooky = false;
      for (let i = 0; i < 40 && a.partner !== null; i++)
        for (const e of g.update(0.02))
          if (e.type === 'paradox' && e.paradox.kind === 'spooky') spooky = true;
      if (a.partner !== null || !spooky) continue;
      const ca = a.psi.lattice.col[a.psi.definiteSite()]!;
      const cb = b.psi.lattice.col[b.psi.definiteSite()]!;
      const ra = a.psi.lattice.row[a.psi.definiteSite()]!;
      const rb = b.psi.lattice.row[b.psi.definiteSite()]!;
      expect(cb).toBe(g.map.cols - 1 - ca);
      expect(rb).toBe(ra);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('a cherry spreads faster than a pear', () => {
    const spread = (kind: string) => {
      const { g, made } = withFruits(5, [[kind, 6, 5]]);
      g.setEyes(false);
      for (let i = 0; i < 100; i++) g.update(0.02);
      return made[0]!.psi.stats().spread;
    };
    expect(spread('cherry')).toBeGreaterThan(1.5 * spread('pear'));
  });

  it('hot cells keep a fruit on them classical (decoherence)', () => {
    let definiteHot = 0;
    let definiteCold = 0;
    for (let s = 0; s < 30; s++) {
      const hot = withFruits(500 + s, [['apple', 1, 13]]);
      const cold = withFruits(500 + s, [['apple', 10, 2]]);
      for (const { g } of [hot, cold]) {
        g.setEyes(false);
        for (let i = 0; i < 100; i++) {
          (g as unknown as { acc: number }).acc = 0;
          g.update(0.02);
        }
      }
      // Probability left in the 2×2 square it started in (the hot patch, or plain floor).
      const square = (f: Fruit, c0: number, r0: number) => {
        let sum = 0;
        for (const dc of [0, 1])
          for (const dr of [0, 1]) sum += f.psi.probability(f.psi.lattice.siteAt(c0 + dc, r0 + dr));
        return sum;
      };
      if (square(hot.made[0]!, 1, 13) > 0.5) definiteHot++;
      if (square(cold.made[0]!, 10, 2) > 0.5) definiteCold++;
    }
    expect(definiteHot).toBeGreaterThan(definiteCold + 10);
  });

  it('a spread fruit has interference nodes: cells it cannot be in, with it on both sides', () => {
    const { g, made } = withFruits(6, [['cherry', 6, 5]]);
    g.setEyes(false);
    let found = 0;
    for (let i = 0; i < 200; i++) {
      g.update(0.02);
      found += g.nodes(made[0]!).length;
    }
    expect(found).toBeGreaterThan(0);
  });

  it('stops short at a wall once; a turn then saves it, going on crashes it', () => {
    const OPENW = ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '#..@..#', '#######'];
    const g = new SnakeGame(OPENW, mulberry32(12));
    g.fruits = [];
    let bumped = false;
    for (let i = 0; i < 8 && !bumped; i++)
      for (const e of g.update(g.tick + 1e-6)) if (e.type === 'bump') bumped = true;
    expect(bumped).toBe(true);
    expect(g.alive).toBe(true);
    g.turn('left');
    g.update(g.tick + 1e-6);
    expect(g.alive).toBe(true);

    const h = new SnakeGame(OPENW, mulberry32(13));
    h.fruits = [];
    for (let i = 0; i < 8 && h.alive; i++) h.update(h.tick + 1e-6);
    expect(h.alive).toBe(false);
  });
});
