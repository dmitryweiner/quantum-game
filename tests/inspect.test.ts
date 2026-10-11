import { describe, expect, it } from 'vitest';
import { LevelSim } from '../src/game/systems/LevelSim';
import { inspectCell } from '../src/game/ui/inspect';
import { SANDBOX } from '../src/levels/sandbox';
import { mulberry32 } from '../src/quantum/rng';
import { EFFECTS } from '../src/strings/effects';

describe('inspect', () => {
  const sim = new LevelSim(SANDBOX, mulberry32(1));

  it('describes every quantum object in the sandbox', () => {
    const roles = ['quantum', 'qubit', 'lamp', 'flower', 'core', 'camera', 'hot', 'cold'];
    for (const o of sim.map.objects.filter((o) => roles.includes(o.role))) {
      const info = inspectCell(sim, o.col, o.row);
      expect(info, `${o.char} at ${o.col},${o.row}`).not.toBeNull();
      expect(info!.why.length).toBeGreaterThan(20);
      for (const e of info!.effects) expect(EFFECTS[e]).toBeDefined();
    }
  });

  it('names a fixed object even under a passing cloud', () => {
    const fresh = new LevelSim(SANDBOX, mulberry32(2));
    for (const b of fresh.bodies) b.psi.evolve(3);
    const f = fresh.flowers[0]!.def;
    expect(inspectCell(fresh, f.col, f.row)?.title).toMatch(/flower|цветок/i);
  });

  it('describes the observer and ignores empty floor', () => {
    const me = sim.playerCell();
    expect(inspectCell(sim, me.col, me.row)?.title).toMatch(/observer|наблюдатель/);
    expect(inspectCell(sim, 13, 11)).toBeNull();
  });

  it('never changes the state it describes', () => {
    const cat = sim.bodies.find((b) => b.def.char === 'c')!;
    cat.psi.evolve(1);
    const before = Array.from(cat.psi.probabilities());
    inspectCell(sim, cat.def.col, cat.def.row);
    expect(Array.from(cat.psi.probabilities())).toEqual(before);
  });
});
