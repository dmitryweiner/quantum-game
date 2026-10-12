import { describe, expect, it } from 'vitest';
import { TANKS_ARENA } from '../src/arcade/arenas';
import { TankGame } from '../src/arcade/tanks';
import { mulberry32 } from '../src/quantum/rng';

const still = { x: 0, y: 0 };

/** A game with one enemy placed, definite, at a cell. */
function withEnemy(seed: number, col: number, row: number) {
  const g = new TankGame(TANKS_ARENA, mulberry32(seed));
  // Let the first spawn happen, then move it.
  for (let i = 0; i < 80 && g.enemies.length === 0; i++) g.update(0.02, still, Math.PI / 2, false);
  const e = g.enemies[0]!;
  e.psi.collapseTo(e.psi.lattice.siteAt(col, row));
  return g;
}

describe('quantum tanks', () => {
  it('an enemy in the turret view stays put (Zeno); out of view it spreads', () => {
    // Player at (6, 11) looking up the open column x = 6 … (6, 8) is in view.
    const g = withEnemy(1, 6, 10);
    for (let i = 0; i < 50; i++) g.update(0.02, still, -Math.PI / 2, false);
    expect(g.enemies[0]!.psi.definiteSite()).toBeGreaterThanOrEqual(0);

    const h = withEnemy(2, 1, 1);
    for (let i = 0; i < 50; i++) h.update(0.02, still, Math.PI / 2, false);
    expect(h.enemies[0]!.psi.definiteSite()).toBe(-1);
  });

  it('a shell always hits an enemy it is sure about', () => {
    const g = withEnemy(3, 6, 10);
    for (let i = 0; i < 40 && g.score === 0; i++) g.update(0.02, still, -Math.PI / 2, true);
    expect(g.score).toBe(1);
    expect(g.enemies.length).toBe(0);
  });

  it('a shell through a cloud hits only sometimes', () => {
    let hits = 0;
    const runs = 100;
    for (let seed = 0; seed < runs; seed++) {
      const g = withEnemy(seed, 6, 10);
      const psi = g.enemies[0]!.psi;
      // Half of the enemy straight ahead, half far to the side.
      psi.re.fill(0);
      psi.im.fill(0);
      psi.re[psi.lattice.siteAt(6, 10)] = Math.SQRT1_2;
      psi.re[psi.lattice.siteAt(1, 10)] = Math.SQRT1_2;
      // Fire looking away (so the view does not collapse it first), then let the shell fly up.
      g.aim = -Math.PI / 2;
      (g as unknown as { shells: unknown[] }).shells.push({
        pos: { x: 6.5, y: 11.5 },
        dir: { x: 0, y: -1 },
      });
      g.cone = { ...g.cone, range: 0 };
      (g as unknown as { moveShells: (dt: number, e: unknown[]) => void }).moveShells(0.2, []);
      if (g.score === 1) hits++;
    }
    expect(hits / runs).toBeGreaterThan(0.3);
    expect(hits / runs).toBeLessThan(0.7);
  });

  it('shells break bricks', () => {
    const g = new TankGame(TANKS_ARENA, mulberry32(4));
    // Brick at (6, 9) is straight above the player at (6, 11).
    for (let i = 0; i < 30; i++) g.update(0.02, still, -Math.PI / 2, true);
    expect(g.tile(6, 9)).toBe('floor');
  });

  it('left alone, enemy clouds tunnel to the base and destroy it', () => {
    const g = new TankGame(TANKS_ARENA, mulberry32(5));
    // Looking at the side wall: nothing to freeze the clouds on their way.
    for (let i = 0; i < 300 / 0.05 && !g.over; i++) g.update(0.05, still, 0, false);
    expect(g.over).toBe(true);
  });

  it('a bot that aims at the likeliest enemy and fires holds out much longer', () => {
    const survive = (smart: boolean, seed: number) => {
      const g = new TankGame(TANKS_ARENA, mulberry32(seed));
      let t = 0;
      for (; t < 180 && !g.over; t += 0.05) {
        let aim = 0;
        const target = g.enemies[0];
        if (smart && target) {
          const p = target.psi;
          let best = 0;
          for (let i = 0; i < p.lattice.size; i++)
            if (p.probability(i) > p.probability(best)) best = i;
          aim = Math.atan2(
            p.lattice.row[best]! + 0.5 - g.player.y,
            p.lattice.col[best]! + 0.5 - g.player.x,
          );
        }
        g.update(0.05, still, aim, smart);
      }
      return t;
    };
    let smart = 0;
    let idle = 0;
    for (let s = 0; s < 6; s++) {
      smart += survive(true, s);
      idle += survive(false, s);
    }
    expect(smart).toBeGreaterThan(idle * 1.5);
  });
});
