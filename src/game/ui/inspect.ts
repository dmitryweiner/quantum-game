import { tileAt } from '../../levels/map';
import type { EffectId } from '../../strings/effects';
import { T } from '../../strings/ui';
import { lampLook, qubitEmoji } from '../systems/looks';
import type { LevelSim } from '../systems/LevelSim';

export interface InspectInfo {
  title: string;
  state: string[];
  why: string;
  effects: EffectId[];
}

/** Below this chance a ghost does not count as "there" for a tap. */
const GHOST_P = 0.003;

/**
 * Describes whatever is in a grid cell right now — for the 🔍 inspect
 * mode. Reads the simulation only; inspecting never measures anything.
 */
export function inspectCell(sim: LevelSim, col: number, row: number): InspectInfo | null {
  const s = T().inspect;
  const pct = s.percent;

  const at = <O extends { col: number; row: number }>(o: O) => o.col === col && o.row === row;

  const ball = sim.qubits.find(at);
  if (ball && sim.pair) {
    const side = ball.side ?? 0;
    const local = sim.pair.local[side];
    const glasses = local && Math.abs(local.angle) > 1e-9 ? 'X' : 'Z';
    return {
      title: s.ballName,
      state: [local ? s.ballColour(qubitEmoji(sim.pair, side), glasses) : s.ballNone],
      why: s.ballWhy,
      effects: ['entanglement', 'complementarity'],
    };
  }

  const lamp = sim.lamps.find((l) => at(l.def));
  if (lamp) {
    const look = lampLook(lamp, sim.glasses);
    const text = {
      on: s.lampOn,
      off: s.lampOff,
      plus: s.lampPlus,
      minus: s.lampMinus,
    }[look ?? 'on'];
    return {
      title: s.lampName,
      state: [s.lampState(look === null ? s.lampUndecided : text)],
      why: s.lampWhy,
      effects: ['superposition', 'complementarity'],
    };
  }

  const flower = sim.flowers.find((f) => at(f.def));
  if (flower) {
    return {
      title: s.flowerName,
      state: [s.flowerState(pct(flower.r.p1))],
      why: s.flowerWhy,
      effects: ['zeno', 'collapse'],
    };
  }

  // The cloud most likely to be in this cell, if any.
  const body = sim.bodies
    .map((b) => ({ b, site: b.psi.lattice.siteAt(col, row) }))
    .filter(({ b, site }) => site >= 0 && b.psi.probability(site) >= GHOST_P)
    .sort((x, y) => y.b.psi.probability(y.site) - x.b.psi.probability(x.site))[0];
  if (body) {
    const { psi } = body.b;
    const site = body.site;
    if (body.b.def.emoji === '⚛️') {
      const { spread } = psi.stats();
      return {
        title: s.atomName,
        state: [s.atomState((2 * spread).toFixed(1)), s.atomFocus(sim.blur === 0)],
        why: s.atomWhy,
        effects: ['uncertainty', 'superposition'],
      };
    }
    const definite = psi.definiteSite() >= 0;
    let cells = 0;
    let best = 0;
    for (let i = 0; i < psi.lattice.size; i++) {
      const p = psi.probability(i);
      if (p >= GHOST_P) cells++;
      best = Math.max(best, p);
    }
    return {
      title: s.catName,
      state: [definite ? s.catDefinite : s.catSpread(cells, pct(psi.probability(site)), pct(best))],
      why: s.catWhy,
      effects: ['superposition', 'collapse', 'born-rule', 'quantum-walk'],
    };
  }

  const core = sim.cores.find((c) => at(c.def));
  if (core) {
    return {
      title: s.coreName,
      state: [core.decayed ? s.coreDecayed : s.coreState(pct(core.r.p1))],
      why: s.coreWhy,
      effects: ['zeno', 'collapse'],
    };
  }
  if (sim.cameras.some((c) => at(c.def))) {
    return {
      title: s.cameraName(sim.camerasOn),
      state: [],
      why: s.cameraWhy,
      effects: ['decoherence', 'collapse'],
    };
  }
  if (tileAt(sim.map, col, row) === 'barrier') {
    return { title: s.barrierName, state: [], why: s.barrierWhy, effects: ['tunnelling'] };
  }

  const obj = sim.map.objects.find((o) => at(o) && o.role !== 'quantum' && o.role !== 'zone');
  if (obj?.role === 'source') {
    return { title: s.sourceName, state: [], why: s.sourceWhy, effects: ['interference'] };
  }
  if (obj?.role === 'slit') {
    return { title: s.slitName, state: [], why: s.slitWhy, effects: ['interference', 'collapse'] };
  }
  if (obj?.role === 'screen') {
    return obj.lamp
      ? { title: s.screenLampName, state: [], why: s.screenLampWhy, effects: ['interference'] }
      : {
          title: s.screenName,
          state: [],
          why: s.screenWhy,
          effects: ['interference', 'born-rule'],
        };
  }
  if (obj?.role === 'switch') {
    return { title: s.switchName, state: [], why: s.switchWhy, effects: ['decoherence'] };
  }
  if (obj?.role === 'hot') {
    return { title: s.hotName, state: [], why: s.hotWhy, effects: ['decoherence', 'quantum-walk'] };
  }
  if (obj?.role === 'cold') {
    return { title: s.coldName, state: [], why: s.coldWhy, effects: ['decoherence'] };
  }
  if (obj?.role === 'exit') {
    return { title: s.exitName, state: [], why: s.exitWhy, effects: ['zeno'] };
  }
  if (obj?.role === 'target') {
    const detector = obj.emoji === '🎯';
    return {
      title: detector ? s.detectorName : s.doorName,
      state: [],
      why: detector ? s.detectorWhy : s.doorWhy,
      effects: detector ? ['uncertainty', 'zeno'] : ['collapse'],
    };
  }
  if (obj?.role === 'plate') {
    return {
      title: `${s.plateName} ${obj.emoji}`,
      state: [],
      why: s.plateWhy,
      effects: ['entanglement'],
    };
  }
  if (sim.zone.some(at)) {
    return { title: s.zoneName, state: [], why: s.zoneWhy, effects: ['uncertainty'] };
  }
  const me = sim.playerCell();
  if (me.col === col && me.row === row) {
    return { title: s.playerName, state: [], why: s.playerWhy, effects: ['collapse'] };
  }
  return null;
}
