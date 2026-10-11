import type { LevelDef } from './types';

/** Free play: wander among quantum objects (PLAN.md §1.2). Never won. */
export const SANDBOX: LevelDef = {
  id: 'sandbox',
  chapter: 0,
  title: { en: 'Sandbox', ru: 'Песочница' },
  goal: {
    en: 'Look around, close your eyes, look again. 🔍 explains any object.',
    ru: 'Осмотрись, закрой глаза, посмотри снова. 🔍 объяснит любой объект.',
  },
  whyClassicalFails: { en: '', ru: '' },
  explanation: { en: '', ru: '' },
  effects: [
    'superposition',
    'collapse',
    'born-rule',
    'quantum-walk',
    'negative-result',
    'zeno',
    'entanglement',
    'complementarity',
    'uncertainty',
  ],
  map: [
    '###############',
    '#.......#.....#',
    '#..c....#..E..#',
    '#.......#.....#',
    '#...f...###=###',
    '#.............#',
    '#..L....a.....#',
    '#.............#',
    '#####=#####...#',
    '#.e...#...p...#',
    '#.....#.......#',
    '#..@..........#',
    '###############',
  ],
  glasses: true,
  focus: true,
  winCondition: { type: 'catch-at-target' },
};
