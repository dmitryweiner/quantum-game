/**
 * Reference of quantum effects (PLAN.md §1.4.4). Each effect is described
 * once; levels refer to it by id.
 */
export type EffectId =
  'superposition' | 'collapse' | 'born-rule' | 'quantum-walk' | 'negative-result' | 'zeno';

export interface EffectInfo {
  id: EffectId;
  name: string;
  /** 1–3 plain-language sentences. */
  summary: string;
  links: { title: string; url: string }[];
}

export const EFFECTS: Readonly<Record<EffectId, EffectInfo>> = {
  superposition: {
    id: 'superposition',
    name: 'Quantum superposition',
    summary:
      'An unobserved quantum object is not secretly in one place: it is genuinely spread over many possibilities at once. ' +
      'The ghosts you see are all the places the cat could turn up — Schrödinger’s cat, but with a map.',
    links: [
      {
        title: 'Wikipedia: Quantum superposition',
        url: 'https://en.wikipedia.org/wiki/Quantum_superposition',
      },
      {
        title: 'Wikipedia: Schrödinger’s cat',
        url: 'https://en.wikipedia.org/wiki/Schr%C3%B6dinger%27s_cat',
      },
    ],
  },
  collapse: {
    id: 'collapse',
    name: 'Measurement and collapse',
    summary:
      'Looking at a quantum object forces it to pick one definite answer, and the other possibilities vanish. ' +
      'In physics “looking” means any interaction that records where the object is — eyes are optional.',
    links: [
      {
        title: 'Wikipedia: Wave function collapse',
        url: 'https://en.wikipedia.org/wiki/Wave_function_collapse',
      },
      {
        title: 'Wikipedia: Observer effect (physics)',
        url: 'https://en.wikipedia.org/wiki/Observer_effect_(physics)',
      },
    ],
  },
  'born-rule': {
    id: 'born-rule',
    name: 'The Born rule',
    summary:
      'Which possibility wins is truly random, but not arbitrary: the brighter a ghost, the more likely the object shows up there. ' +
      'Nature rolls loaded dice, and the wave decides how they are loaded.',
    links: [{ title: 'Wikipedia: Born rule', url: 'https://en.wikipedia.org/wiki/Born_rule' }],
  },
  'quantum-walk': {
    id: 'quantum-walk',
    name: 'Quantum walk',
    summary:
      'A spreading quantum object does not wander like a drunk; its waves race outwards and interfere. ' +
      'It covers distance in proportion to time — much faster than a random walk — and is most likely found at the leading edge.',
    links: [
      { title: 'Wikipedia: Quantum walk', url: 'https://en.wikipedia.org/wiki/Quantum_walk' },
    ],
  },
  'negative-result': {
    id: 'negative-result',
    name: 'Negative-result measurement',
    summary:
      'Looking somewhere and seeing nothing is a measurement too: the object can no longer be there, so its chances move elsewhere. ' +
      'You changed the cat without ever touching or even seeing it.',
    links: [
      {
        title: 'Wikipedia: Renninger negative-result experiment',
        url: 'https://en.wikipedia.org/wiki/Renninger_negative-result_experiment',
      },
    ],
  },
  zeno: {
    id: 'zeno',
    name: 'Quantum Zeno effect',
    summary:
      'A quantum system that is watched constantly cannot change: every look resets it before it gets anywhere. ' +
      'A watched spot stays empty, and a watched cat stays put.',
    links: [
      {
        title: 'Wikipedia: Quantum Zeno effect',
        url: 'https://en.wikipedia.org/wiki/Quantum_Zeno_effect',
      },
    ],
  },
};
