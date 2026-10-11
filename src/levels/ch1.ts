import type { LevelDef } from './types';

const CATCH_GOAL = { en: 'Catch the cat 🐱 at the door 🚪', ru: 'Поймай кота 🐱 у двери 🚪' };

/** Chapter 1 — superposition, collapse and the observer effect. */
export const CHAPTER_1: LevelDef[] = [
  {
    id: 'ch1-01',
    chapter: 1,
    title: { en: 'Peekaboo', ru: 'Ку-ку' },
    goal: CATCH_GOAL,
    hint: {
      en:
        'Close your eyes (lift your right thumb, or hold Space) and the cat dissolves into ghosts — ' +
        'every place it could be. Look again and it snaps into one of them. Peek until you catch it at the door.',
      ru:
        'Закрой глаза (отпусти правый палец или зажми пробел) — и кот рассыплется на призраков: это все места, где он может быть. ' +
        'Посмотри снова — и он окажется в одном из них. Подглядывай, пока не поймаешь его у двери.',
    },
    whyClassicalFails: {
      en:
        'The glass keeps you out, and a classical cat that is being watched just sits there. ' +
        'Only an unobserved, spreading cat can reach the door.',
      ru:
        'Стекло не пускает тебя к коту, а обычный кот под присмотром просто сидит на месте. ' +
        'До двери может добраться только кот, на которого никто не смотрит, — «размазанный».',
    },
    explanation: {
      en:
        'While nobody looked, the cat was not hiding somewhere — it was spread over the whole corridor at once. ' +
        'Your glance forced it to pick one spot, at random but weighted by how bright each ghost was.',
      ru:
        'Пока никто не смотрел, кот не прятался где-то в одном месте — он был размазан по всему коридору сразу. ' +
        'Твой взгляд заставил его выбрать одну клетку: случайно, но чем ярче был призрак, тем вероятнее.',
    },
    effects: ['superposition', 'collapse', 'born-rule'],
    map: ['#########', '#c.....D#', '#=======#', '#.......#', '#...@...#', '#########'],
    winCondition: { type: 'catch-at-target' },
  },
  {
    id: 'ch1-02',
    chapter: 1,
    title: { en: "Don't Stare", ru: 'Не пялься' },
    goal: CATCH_GOAL,
    whyClassicalFails: {
      en:
        'Watching the door never brings the cat: every look that finds nothing pushes it back out. ' +
        'You have to look away and let the possibilities grow.',
      ru:
        'Если всё время смотреть на дверь, кот к ней не придёт: каждый взгляд, который его не находит, выталкивает его оттуда. ' +
        'Нужно отвернуться и дать возможностям разрастись.',
    },
    explanation: {
      en:
        'Each time you looked at the door and saw no cat, the chance of the cat being there was wiped out. ' +
        'Look all the time and it never gets a chance to arrive — the quantum Zeno effect, “a watched pot never boils”.',
      ru:
        'Каждый раз, когда ты смотрел на дверь и не видел кота, шанс найти его там обнулялся. ' +
        'Смотри непрерывно — и он так и не придёт. Это квантовый эффект Зенона: «кто над чайником стоит, у того он не кипит».',
    },
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
    title: { en: 'Wave Rider', ru: 'Оседлай волну' },
    goal: {
      en: 'Catch the cat 🐱 at the door 🚪 — be quick',
      ru: 'Поймай кота 🐱 у двери 🚪 — быстро',
    },
    whyClassicalFails: {
      en:
        'There is just one window onto the door and little time. Peek too early and you erase the cat’s chances; ' +
        'you need to look exactly when its wave arrives.',
      ru:
        'К двери ведёт одно окошко, а времени мало. Подглядишь слишком рано — сотрёшь шансы кота. ' +
        'Смотреть нужно ровно тогда, когда до двери докатится его волна.',
    },
    explanation: {
      en:
        'The cat’s ghost did not creep along like a random walker — it travelled as a wave and piled up at the far end, ' +
        'so at the right moment the door was by far the likeliest place. That speed is what makes quantum walks useful for quantum algorithms.',
      ru:
        'Призрак кота не полз, как случайный бродяга, — он бежал волной и накапливался у дальнего конца, ' +
        'поэтому в нужный момент дверь была самым вероятным местом. Именно эта скорость делает квантовые блуждания полезными для квантовых алгоритмов.',
    },
    effects: ['superposition', 'quantum-walk', 'born-rule', 'negative-result'],
    map: [
      '#################',
      '#c.............D#',
      '###############=#',
      '#..............@#',
      '#################',
    ],
    winCondition: { type: 'catch-at-target' },
    timeLimit: 20,
  },
];
