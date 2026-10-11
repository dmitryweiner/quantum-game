import type { LevelDef } from './types';

/** Free play: wander among quantum objects (PLAN.md §1.2). Never won. */
export const SANDBOX: LevelDef = {
  id: 'sandbox',
  chapter: 0,
  title: { en: 'Sandbox', ru: 'Песочница' },
  goal: {
    en: 'Look around. Close your eyes. Look again.',
    ru: 'Осмотрись. Закрой глаза. Посмотри снова.',
  },
  whyClassicalFails: { en: '', ru: '' },
  explanation: { en: '', ru: '' },
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
