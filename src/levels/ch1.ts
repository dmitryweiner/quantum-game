import type { LevelDef } from './types';

/** Chapter 1 — superposition, collapse and the observer effect. */
export const CHAPTER_1: LevelDef[] = [
  {
    id: 'ch1-01',
    chapter: 1,
    title: 'Peekaboo',
    goal: 'Catch the cat 🐱 at the door 🚪',
    hint:
      'Close your eyes (lift your right thumb, or hold Space) and the cat dissolves into ghosts — ' +
      'every place it could be. Look again and it snaps into one of them. Peek until you catch it at the door.',
    whyClassicalFails:
      'The glass keeps you out, and a classical cat that is being watched just sits there. ' +
      'Only an unobserved, spreading cat can reach the door.',
    explanation:
      'While nobody looked, the cat was not hiding somewhere — it was spread over the whole corridor at once. ' +
      'Your glance forced it to pick one spot, at random but weighted by how bright each ghost was.',
    effects: ['superposition', 'collapse', 'born-rule'],
    map: ['#########', '#c.....D#', '#=======#', '#.......#', '#...@...#', '#########'],
    winCondition: { type: 'catch-at-target' },
  },
  {
    id: 'ch1-02',
    chapter: 1,
    title: "Don't Stare",
    goal: 'Catch the cat 🐱 at the door 🚪',
    whyClassicalFails:
      'Watching the door never brings the cat: every look that finds nothing pushes it back out. ' +
      'You have to look away and let the possibilities grow.',
    explanation:
      'Each time you looked at the door and saw no cat, the chance of the cat being there was wiped out. ' +
      'Look all the time and it never gets a chance to arrive — the quantum Zeno effect, “a watched pot never boils”.',
    effects: ['superposition', 'collapse', 'negative-result', 'zeno'],
    map: [
      '###############',
      '#c...........D#',
      '############=##',
      '#..........@..#',
      '###############',
    ],
    winCondition: { type: 'catch-at-target' },
    timeLimit: 20,
  },
  {
    id: 'ch1-03',
    chapter: 1,
    title: 'Wave Rider',
    goal: 'Catch the cat 🐱 at the door 🚪 — be quick',
    whyClassicalFails:
      'There is just one window onto the door and little time. Peek too early and you erase the cat’s chances; ' +
      'you need to look exactly when its wave arrives.',
    explanation:
      'The cat’s ghost did not creep along like a random walker — it travelled as a wave and piled up at the far end, ' +
      'so at the right moment the door was by far the likeliest place. That speed is what makes quantum walks useful for quantum algorithms.',
    effects: ['superposition', 'quantum-walk', 'born-rule', 'negative-result'],
    map: [
      '#################',
      '#c.............D#',
      '###############=#',
      '#..............@#',
      '#################',
    ],
    winCondition: { type: 'catch-at-target' },
    timeLimit: 12,
  },
];
