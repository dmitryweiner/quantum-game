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
          case 'light-lamp':
            expect(has('source') && has('slit') && has('screen')).toBe(true);
            expect(map.objects.some((o) => o.lamp)).toBe(true);
            break;
          case 'bombs':
            expect(level.winCondition.bombs).toBeLessThan(level.winCondition.boxes);
            break;
          case 'teleport':
          case 'spy':
          case 'plinko':
          case 'pairs':
            break;
          case 'escape':
            expect(has('core') && has('exit')).toBe(true);
            break;
          case 'zone-after-dark':
            expect(has('quantum') && has('zone')).toBe(true);
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

/** Watch the door's percentage and glance when it peaks (what the HUD label invites). */
const peakGlance = (door: Vec2): Strategy => {
  let prev = 0;
  return (t, sim) => {
    if (t === 0) prev = 0;
    const b = sim.bodies[0]!;
    const p = b.psi.probability(b.psi.lattice.siteAt(Math.floor(door.x), Math.floor(door.y)));
    const glance = p < prev && prev >= 0.12;
    prev = glance ? 0 : p;
    return glance ? door : null;
  };
};

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

describe('chapter 4 playtest', () => {
  const ch4 = (id: string) => LEVELS.find((l) => l.id === id)!;

  it('ch4-01: blinking at the door catches the tunnelling cat', () => {
    const level = ch4('ch4-01');
    expect(winRate(level, () => null, 20, 40)).toBe(0);
    expect(winRate(level, peakGlance(doorOf(level)), 100, 40)).toBeGreaterThan(0.6);
  });

  it('ch4-01: a field three cells thick lets almost nothing through', () => {
    const level = ch4('ch4-01');
    const thick = { ...level, map: level.map.map((r) => r.replace('...%...', '..%%%..')) };
    expect(winRate(thick, peakGlance(doorOf(thick)), 100, 40)).toBeLessThan(0.1);
  });

  /** Walk a route of waypoints; optionally keep looking at the core. */
  function escape(watch: boolean, seed: number): string {
    const sim = new LevelSim(ch4('ch4-02'), mulberry32(seed));
    const core = sim.cores[0]!.def;
    const exit = sim.map.objects.find((o) => o.role === 'exit')!;
    const route = [
      { x: 1.5, y: 1.5 },
      { x: exit.col + 0.5, y: 1.5 },
      { x: exit.col + 0.5, y: exit.row + 0.5 },
    ];
    let leg = 0;
    while (sim.status === 'playing' && sim.time < 30) {
      const to = route[Math.min(leg, route.length - 1)]!;
      const dx = to.x - sim.player.x;
      const dy = to.y - sim.player.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.1 && leg < route.length - 1) leg++;
      const move = d < 0.05 ? { x: 0, y: 0 } : { x: dx / d, y: dy / d };
      sim.step(1 / 60, move, watch ? { x: core.col + 0.5, y: core.row + 0.5 } : null);
    }
    return sim.status;
  }

  it('ch4-02: watching the core on the way keeps it intact', () => {
    let wins = 0;
    for (let s = 0; s < 60; s++) if (escape(true, s) === 'won') wins++;
    expect(wins / 60).toBeGreaterThan(0.85);
  });

  it('ch4-02: walking off without looking lets it decay', () => {
    let wins = 0;
    for (let s = 0; s < 60; s++) if (escape(false, s) === 'won') wins++;
    expect(wins / 60).toBeLessThan(0.15);
  });

  /** Stand next to the switch; step on it when the door's chance peaks (or always / never). */
  function remoteEye(mode: 'peak' | 'always' | 'never', seed: number): string {
    const sim = new LevelSim(ch4('ch4-03'), mulberry32(seed));
    const sw = sim.map.objects.find((o) => o.role === 'switch')!;
    const door = sim.map.objects.find((o) => o.role === 'target')!;
    const body = sim.bodies[0]!;
    const off = { x: sw.col - 0.5, y: sw.row + 0.5 };
    const on = { x: sw.col + 0.5, y: sw.row + 0.5 };
    let prev = 0;
    let onFor = 0;
    while (sim.status === 'playing') {
      const p = body.psi.probability(body.psi.lattice.siteAt(door.col, door.row));
      const peak = p < prev && prev >= 0.2;
      prev = p;
      if (mode === 'always' || (mode === 'peak' && (peak || onFor > 0))) {
        onFor = onFor > 0 ? onFor - 1 : 2;
        sim.player = on;
      } else sim.player = off;
      sim.step(1 / 60, { x: 0, y: 0 }, null);
      if (mode !== 'peak') onFor = 0;
    }
    return sim.status;
  }

  it('ch4-03: brief camera flashes at the right moment catch the cat', () => {
    let wins = 0;
    for (let s = 0; s < 80; s++) if (remoteEye('peak', s) === 'won') wins++;
    expect(wins / 80).toBeGreaterThan(0.6);
  });

  it('ch4-03: a camera left on never lets the cat in (Zeno); off, it never sees it', () => {
    let wins = 0;
    for (let s = 0; s < 40; s++) if (remoteEye('always', s) === 'won') wins++;
    for (let s = 0; s < 40; s++) if (remoteEye('never', s) === 'won') wins++;
    expect(wins / 80).toBeLessThan(0.1);
  });
});

describe('chapter 5 playtest', () => {
  const level = LEVELS.find((l) => l.id === 'ch5-01')!;
  const slit = (sim: LevelSim) => {
    const s = sim.slits.reduce((a, b) => (b.row > a.row ? b : a));
    return { x: s.col + 0.5, y: s.row + 0.5 };
  };

  it('ch5-01: watching a slit lights the lamp', () => {
    expect(winRate(level, (_t, sim) => slit(sim), 100, 60)).toBeGreaterThan(0.6);
  });

  it('ch5-01: with both paths open the dark stripe stays dark', () => {
    expect(winRate(level, () => null, 100, 60)).toBeLessThan(0.05);
  });
});

describe('classical mode', () => {
  for (const level of LEVELS.filter((l) => l.classicalIntro)) {
    it(`${level.id}: cannot be won with everyday physics`, () => {
      const door = doorOf(level);
      let wins = 0;
      for (let seed = 0; seed < 20; seed++) {
        const sim = new LevelSim(level, mulberry32(seed), false, true);
        while (sim.status === 'playing' && sim.time < 30) {
          // Blink at the target, and glance at the object now and then.
          const b = sim.bodies[0]!.def;
          const look =
            sim.time % 1.02 >= 1
              ? door
              : sim.time % 2.1 < 0.03
                ? { x: b.col + 0.5, y: b.row + 0.5 }
                : null;
          sim.step(1 / 60, { x: 0, y: 0 }, look);
        }
        if (sim.status === 'won') wins++;
      }
      expect(wins).toBe(0);
    });
  }
});

describe('chapter 1 playtest', () => {
  for (const level of LEVELS.filter((l) => l.chapter === 1)) {
    const door = doorOf(level);
    it(`${level.id}: never won with eyes closed`, () => {
      expect(winRate(level, () => null, 20)).toBe(0);
    });
    // Wave Rider is about timing: glance when the door's percentage peaks.
    const strategy = level.id === 'ch1-03' ? peakGlance(door) : blink(door);
    it(`${level.id}: the intended strategy usually wins`, () => {
      expect(winRate(level, strategy)).toBeGreaterThan(0.6);
    });
  }

  it('ch1-02: staring at the door almost never wins (Zeno)', () => {
    const level = LEVELS.find((l) => l.id === 'ch1-02')!;
    expect(winRate(level, () => doorOf(level))).toBeLessThan(0.15);
  });
});
