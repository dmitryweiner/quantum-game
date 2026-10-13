import { describe, expect, it } from 'vitest';
import { INVADERS, InvadersGame, type InvaderEvent } from '../src/arcade/invaders';
import { floodLattice } from '../src/quantum/lattice';
import { Superposition } from '../src/quantum/superposition';
import { mulberry32 } from '../src/quantum/rng';

const idle = { move: 0, look: false, fire: false };

interface Internals {
  moveBombs(dt: number, events: InvaderEvent[]): void;
  field: Superposition['lattice'];
}

/** Lands one bomb dropped from (col, row); returns the column it landed in, or null. */
function landBomb(seed: number, col: number, row: number, shipX: number, look: boolean) {
  const g = new InvadersGame(mulberry32(seed));
  const inner = g as unknown as Internals;
  g.shipX = shipX;
  g.look = look;
  const psi = new Superposition(inner.field, 0, INVADERS.bombHop);
  psi.setWavePacket({ x: col, y: row }, INVADERS.bombWidth, { x: 0, y: INVADERS.bombK });
  g.bombs = [
    {
      id: 999,
      age: 0,
      def: { char: 'B', role: 'quantum', emoji: '💣', col, row },
      psi,
      seen: new Array<boolean>(inner.field.size).fill(false),
    },
  ];
  g.lives = 99;
  for (let i = 0; i < 400 && g.bombs.length; i++) {
    const events: InvaderEvent[] = [];
    inner.moveBombs(0.02, events);
    for (const e of events) if (e.type === 'landed') return e.col;
  }
  return null;
}

function landings(runs: number, shipX: number, look: boolean) {
  const counts = new Array<number>(INVADERS.cols).fill(0);
  let through = 0;
  for (let s = 0; s < runs; s++) {
    const c = landBomb(s, 5, 6, shipX, look);
    if (c !== null) {
      counts[c]!++;
      through++;
    }
  }
  return { counts, through };
}

/**
 * Where a bomb dropped at (5, 6) lands, as exact odds per column: the same
 * lattice, detectors and look rate as InvadersGame's bombs, but the shield and
 * the ground are tallied as probabilities instead of sampled (far less noise).
 */
function landingOdds(cameras: boolean, runs: number) {
  const { cols, rows, shieldRow: S, slits } = INVADERS;
  const isWall = (c: number, r: number) =>
    (r === S && !slits.includes(c)) || (r > S && (c === 0 || c === cols - 1));
  const lat = floodLattice(
    { col: 0, row: 0 },
    (c, r) => c >= 0 && c < cols && r >= 0 && r < rows && !isWall(c, r),
  );
  const space: number[] = [];
  const ground: number[] = [];
  const view = new Array<number>(lat.size).fill(0);
  for (let i = 0; i < lat.size; i++) {
    const r = lat.row[i]!;
    if (r === 0) space.push(i);
    else if (r === rows - 1) ground.push(i);
    if (r === S) view[i] = 1;
  }
  const land = new Array<number>(cols).fill(0);
  const rng = mulberry32(7);
  const dt = 0.02;
  for (let k = 0; k < runs; k++) {
    const psi = new Superposition(lat, 0, INVADERS.bombHop);
    psi.setWavePacket({ x: 5, y: 6 }, INVADERS.bombWidth, { x: 0, y: INVADERS.bombK });
    let alive = 1;
    for (let t = 0; t < INVADERS.bombLife; t += dt) {
      psi.evolve(dt);
      if (cameras) psi.measureSoft(view, INVADERS.bombLookRate * dt, 0, rng);
      // A detector with a finite catch rate takes this share of what is on it.
      const share = Math.min(1, INVADERS.bombCatchRate * dt);
      const soak = (sites: number[]) =>
        sites.map((s) => {
          const p = psi.probability(s) * share;
          psi.re[s]! *= Math.sqrt(1 - share);
          psi.im[s]! *= Math.sqrt(1 - share);
          return p;
        });
      alive *= 1 - soak(space).reduce((a, b) => a + b, 0);
      psi.evolve(0);
      const caught = soak(ground);
      caught.forEach((p, j) => (land[lat.col[ground[j]!]!]! += (alive * p) / runs));
      alive *= 1 - caught.reduce((a, b) => a + b, 0);
      psi.evolve(0);
    }
  }
  return land;
}

describe('quantum invaders', () => {
  it('left alone, the formation reaches the shield: the game can be lost', () => {
    const g = new InvadersGame(mulberry32(1));
    g.lives = 99;
    let t = 0;
    while (!g.over && t < 300) {
      g.update(0.05, idle);
      t += 0.05;
    }
    expect(g.over).toBe(true);
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(120);
  });

  it('the searchlight keeps the invaders in its beam still (Zeno); the others spread', () => {
    const g = new InvadersGame(mulberry32(2));
    const lit = g.invaders.find((i) => i.slot.fc === 1 && i.slot.fr === 2)!;
    const dark = g.invaders.find((i) => i.slot.fc === 3 && i.slot.fr === 2)!;
    for (let i = 0; i < 40; i++) {
      g.shipX = g.slotCell(lit.slot).col + 0.5;
      g.update(0.025, { move: 0, look: true, fire: false });
    }
    expect(lit.psi.definiteSite()).toBeGreaterThanOrEqual(0);
    expect(dark.psi.definiteSite()).toBe(-1);
  });

  it('a laser always hits an invader it is sure about', () => {
    const g = new InvadersGame(mulberry32(3));
    const target = g.invaders.find((i) => i.slot.fr === 2 && i.twin === null)!;
    g.shipX = g.slotCell(target.slot).col + 0.5;
    for (let i = 0; i < 60 && g.score === 0; i++)
      g.update(0.02, { move: 0, look: true, fire: true });
    expect(g.score).toBeGreaterThan(0);
  });

  it('a bomb that gets through the slits lands behind the wall more often than under a slit', () => {
    const { counts, through } = landings(600, 9.5, false);
    expect(through).toBeGreaterThan(15);
    expect(counts[5]!).toBeGreaterThan(counts[2]! + counts[8]!);
  });

  it('bombs through the two slits fall in stripes: almost never under the slits', () => {
    const odds = landingOdds(false, 1);
    // Under the slits, less than 6 % as often as behind the middle of the wall.
    expect((odds[2]! + odds[8]!) / 2).toBeLessThan(0.06 * odds[5]!);
  });

  it('cameras on the slits wipe the stripes out: the dark columns fill in', () => {
    const plain = landingOdds(false, 1);
    const watched = landingOdds(true, 120);
    const share = (o: number[], cs: number[]) =>
      cs.reduce((a, c) => a + o[c]!, 0) / o.reduce((a, b) => a + b, 0);
    expect(share(watched, [2, 8])).toBeGreaterThan(3 * share(plain, [2, 8]));
  });

  it('entangled twins settle mirrored: offsets anti-correlated', () => {
    let checked = 0;
    for (let s = 0; s < 40; s++) {
      const g = new InvadersGame(mulberry32(100 + s));
      const a = g.invaders.find((i) => i.twin !== null)!;
      const b = g.byId(a.twin!)!;
      for (let i = 0; i < 60; i++) g.update(0.02, idle);
      if (a.twin === null) continue;
      // Shine on the leader until the pair is measured; read where each one settled.
      const settled = new Map<number, number>();
      for (let i = 0; i < 30 && a.twin !== null; i++) {
        g.shipX = g.slotCell(a.slot).col + 0.5;
        for (const e of g.update(0.02, { move: 0, look: true, fire: false }))
          if (e.type === 'collapsed') settled.set(e.invader, e.site);
      }
      if (!settled.has(a.id) || !settled.has(b.id)) continue;
      const da = a.psi.lattice.col[settled.get(a.id)!]! - g.slotCell(a.slot).col;
      const db = b.psi.lattice.col[settled.get(b.id)!]! - g.slotCell(b.slot).col;
      expect(db + da).toBe(0);
      if (da !== 0) checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('classical mode: invaders sit in their slots', () => {
    const g = new InvadersGame(mulberry32(5));
    g.setClassical(true);
    for (let i = 0; i < 100; i++) g.update(0.02, idle);
    for (const inv of g.invaders) {
      const at = g.slotCell(inv.slot);
      expect(inv.psi.definiteSite()).toBe(inv.psi.lattice.siteAt(at.col, at.row));
    }
  });
});
