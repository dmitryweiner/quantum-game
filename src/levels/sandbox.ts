import type { LevelDef } from './types';

/** Free play: wander among quantum objects (PLAN.md §1.2). Never won. */
export const SANDBOX: LevelDef = {
  id: 'sandbox',
  chapter: 0,
  title: 'Sandbox',
  goal: 'Look around. Close your eyes. Look again.',
  whyClassicalFails: '',
  explanation: '',
  effects: ['superposition', 'collapse', 'born-rule', 'quantum-walk', 'negative-result', 'zeno'],
  map: [
    '###########',
    '#.........#',
    '#..c......#',
    '#.........#',
    '#...###...#',
    '#...#a#...#',
    '#...#.#...#',
    '#.........#',
    '#..L...p..#',
    '#....@....#',
    '###########',
  ],
  winCondition: { type: 'catch-at-target' },
};
