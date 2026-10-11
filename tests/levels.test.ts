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
      it('has a valid map with a cat and a door', () => {
        const map = parseMap(level.map);
        if (level.id === 'sandbox') return;
        expect(map.objects.some((o) => o.role === 'quantum')).toBe(true);
        expect(map.objects.some((o) => o.role === 'target')).toBe(true);
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
