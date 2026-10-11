import { describe, expect, it } from 'vitest';
import { LevelSim } from '../src/game/systems/LevelSim';
import type { Vec2 } from '../src/game/systems/movement';
import { LEVELS } from '../src/levels';
import { parseMap } from '../src/levels/map';
import { SANDBOX } from '../src/levels/sandbox';
import type { LevelDef } from '../src/levels/types';
import { mulberry32 } from '../src/quantum/rng';
import { LOCALES, type Text } from '../src/i18n';
import { EFFECTS } from '../src/strings/effects';

const filled = (t: Text, min = 2) => LOCALES.every((l) => t[l].trim().length >= min);

describe('level definitions', () => {
  it('have unique ids', () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });

  for (const level of [...LEVELS, SANDBOX]) {
    describe(level.id, () => {
      it('has a valid map with what its win condition needs', () => {
        const map = parseMap(level.map);
        if (level.id === 'sandbox') return;
        const has = (role: string) => map.objects.some((o) => o.role === role);
        switch (level.winCondition.type) {
          case 'catch-at-target':
            expect(has('quantum') && has('target')).toBe(true);
            break;
          case 'unlock': {
            const sides = map.objects.filter((o) => o.role === 'qubit').map((o) => o.side);
            expect(sides.sort()).toEqual([0, 1]);
            expect(map.objects.filter((o) => o.role === 'plate')).toHaveLength(2);
            break;
          }
          case 'chsh':
            expect(level.winCondition.threshold).toBeGreaterThan(0.75);
            break;
        }
      });

      it('lists effects that exist in the reference, each with a link', () => {
        expect(level.effects.length).toBeGreaterThan(0);
        for (const id of level.effects) {
          const info = EFFECTS[id];
          expect(info, id).toBeDefined();
          expect(filled(info.name), id).toBe(true);
          expect(filled(info.summary, 20), id).toBe(true);
          for (const l of LOCALES) {
            expect(info.links[l].length, `${id} ${l}`).toBeGreaterThan(0);
            for (const link of info.links[l])
              expect(link.url).toMatch(/^https:\/\/\w+\.wikipedia\.org\//);
          }
        }
      });

      if (level.id !== 'sandbox') {
        it('explains itself in every language (PLAN.md §1.4)', () => {
          expect(filled(level.title)).toBe(true);
          expect(filled(level.goal)).toBe(true);
          if (level.hint) expect(filled(level.hint, 20)).toBe(true);
          expect(filled(level.whyClassicalFails, 20)).toBe(true);
          expect(filled(level.explanation, 20)).toBe(true);
        });
      }
    });
  }

  it('only the first level of a chapter has a hint', () => {
    const seen = new Set<number>();
    for (const l of LEVELS) {
      expect(Boolean(l.hint), l.id).toBe(!seen.has(l.chapter));
      seen.add(l.chapter);
    }
  });
});

// --- Playtesting by simulation -------------------------------------------

type Strategy = (t: number, sim: LevelSim) => Vec2 | null;

const doorOf = (level: LevelDef): Vec2 => {
  const d = parseMap(level.map).objects.find((o) => o.role === 'target')!;
  return { x: d.col + 0.5, y: d.row + 0.5 };
};

function winRate(level: LevelDef, strategy: Strategy, runs = 120, maxTime = 30): number {
  let wins = 0;
  for (let seed = 0; seed < runs; seed++) {
    const sim = new LevelSim(level, mulberry32(seed));
    while (sim.status === 'playing' && sim.time < maxTime) {
      sim.step(1 / 60, { x: 0, y: 0 }, strategy(sim.time, sim));
    }
    if (sim.status === 'won') wins++;
  }
  return wins / runs;
}

/** Eyes closed for a second, then one quick look at the door. */
const blink =
  (door: Vec2): Strategy =>
  (t) =>
    t % 1.02 >= 1 ? door : null;

describe('chapter 2 playtest', () => {
  const ch2 = (id: string) => LEVELS.find((l) => l.id === id)!;

  /** Optionally look at the near ball (with given glasses), then walk to a plate. */
  function unlock(
    level: LevelDef,
    plan: { lookWith: ('Z' | 'X')[]; plate: (sim: LevelSim) => 'first' | 'second' },
    seed: number,
  ) {
    const sim = new LevelSim(level, mulberry32(seed));
    const ball = sim.qubits.find((q) => q.side === 0)!;
    const plates = sim.map.objects.filter((o) => o.role === 'plate');
    const ballAt = { x: ball.col + 0.5, y: ball.row + 0.5 };
    for (const g of plan.lookWith) {
      if (sim.glasses !== g) sim.toggleGlasses();
      sim.step(1 / 60, { x: 0, y: 0 }, ballAt);
    }
    // Teleporting next to the plate keeps the test about quantum rules, not path finding.
    const target = plates[plan.plate(sim) === 'first' ? 0 : 1]!;
    sim.player = { x: target.col + 0.5, y: target.row + 1.5 };
    sim.step(1 / 60, { x: 0, y: -1 }, null);
    for (let i = 0; i < 30 && sim.status === 'playing'; i++)
      sim.step(1 / 60, { x: 0, y: -1 }, null);
    return sim.status;
  }

  const byColour = (sim: LevelSim) => {
    const plates = sim.map.objects.filter((o) => o.role === 'plate');
    const near = sim.pair!.local[0]!;
    return plates[0]!.plate!.outcome === near.outcome ? 'first' : 'second';
  };

  it('ch2-01: looking at your ball first always opens the lock', () => {
    for (let s = 0; s < 40; s++)
      expect(unlock(ch2('ch2-01'), { lookWith: ['Z'], plate: byColour }, s)).toBe('won');
  });

  it('ch2-01: guessing without looking wins about half the time', () => {
    let wins = 0;
    for (let s = 0; s < 200; s++)
      if (unlock(ch2('ch2-01'), { lookWith: [], plate: () => 'first' }, s) === 'won') wins++;
    expect(wins / 200).toBeGreaterThan(0.35);
    expect(wins / 200).toBeLessThan(0.65);
  });

  it('ch2-02: X glasses first always open the lock', () => {
    for (let s = 0; s < 40; s++)
      expect(unlock(ch2('ch2-02'), { lookWith: ['X'], plate: byColour }, s)).toBe('won');
  });

  it('ch2-02: looking with Z first breaks the link even if you then use X', () => {
    let wins = 0;
    for (let s = 0; s < 200; s++) {
      if (unlock(ch2('ch2-02'), { lookWith: ['Z', 'X'], plate: byColour }, s) === 'won') wins++;
    }
    expect(wins / 200).toBeGreaterThan(0.35);
    expect(wins / 200).toBeLessThan(0.65);
  });
});

describe('chapter 3 playtest', () => {
  const ch3 = (id: string) => LEVELS.find((l) => l.id === id)!;
  const atomAt = (sim: LevelSim) => {
    const a = sim.bodies[0]!.def;
    return { x: a.col + 0.5, y: a.row + 0.5 };
  };

  /** Glance at the atom with `focus` (quick looks) until one lands, then look away. */
  const kick = (focus: number, until: number): Strategy => {
    let done = false;
    return (t, sim) => {
      if (t === 0) done = false;
      sim.setFocus(focus);
      const a = atomAt(sim);
      sim.player = { x: a.x + 6, y: a.y + 2 };
      if (sim.bodies[0]!.psi.definiteSite() >= 0 && t > 0) done = true;
      return !done && t < until && t % 0.27 < 0.02 ? a : null;
    };
  };

  it('ch3-01: one sharp kick beats a blurry one or none by far', () => {
    const sharp = winRate(ch3('ch3-01'), kick(1, 3), 120, 30);
    const blurry = winRate(ch3('ch3-01'), kick(0, 3), 120, 30);
    const none = winRate(ch3('ch3-01'), () => null, 60, 30);
    expect(sharp).toBeGreaterThan(0.3);
    expect(blurry).toBeLessThan(sharp / 2.5);
    expect(none).toBeLessThan(0.15);
  });

  const softTouch = (focus: number) => {
    let wins = 0;
    const runs = 60;
    for (let seed = 0; seed < runs; seed++) {
      const sim = new LevelSim(ch3('ch3-02'), mulberry32(seed));
      sim.setFocus(focus);
      // Walk up to the atom first (path finding is not what this tests).
      const a = atomAt(sim);
      sim.player = { x: a.x, y: a.y + 6 };
      while (sim.status === 'playing' && sim.time < 60) {
        sim.step(1 / 30, { x: 0, y: 0 }, sim.phase === 'look' ? atomAt(sim) : null);
      }
      if (sim.status === 'won') wins++;
    }
    return wins / runs;
  };

  it('ch3-02: a blurry look keeps the atom in the ring', { timeout: 120_000 }, () => {
    const rate = softTouch(0);
    console.log('ch3-02 blurry', rate);
    expect(rate).toBeGreaterThan(0.38);
  });

  it('ch3-02: a sharp look kicks it out', { timeout: 120_000 }, () => {
    const rate = softTouch(1);
    console.log('ch3-02 sharp', rate);
    expect(rate).toBeLessThan(0.22);
  });
});

describe('chapter 1 playtest', () => {
  for (const level of LEVELS.filter((l) => l.chapter === 1)) {
    const door = doorOf(level);
    it(`${level.id}: never won with eyes closed`, () => {
      expect(winRate(level, () => null, 20)).toBe(0);
    });
    it(`${level.id}: blinking at the door usually wins`, () => {
      expect(winRate(level, blink(door))).toBeGreaterThan(0.6);
    });
  }

  it('ch1-02: staring at the door almost never wins (Zeno)', () => {
    const level = LEVELS.find((l) => l.id === 'ch1-02')!;
    expect(winRate(level, () => doorOf(level))).toBeLessThan(0.15);
  });
});
