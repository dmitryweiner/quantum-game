import type { LevelDef } from './types';

const LAB = [
  '###########',
  '#.........#',
  '#..R...J..#',
  '#.........#',
  '#....@....#',
  '###########',
];

/** Chapter 7 — crowds and walks: the quantum Galton board and identical particles. */
export const CHAPTER_7: LevelDef[] = [
  {
    id: 'ch7-01',
    chapter: 7,
    title: { en: 'Quantum Plinko', ru: 'Квантовый Плинко' },
    goal: {
      en: 'Catch 5 of 24 quantum balls in one round with your bucket 🪣',
      ru: 'Поймай ведром 🪣 5 из 24 квантовых шариков за один раунд',
    },
    hint: {
      en: 'Each ball starts in the middle and spreads as a wave before it lands. Where would you put the bucket? Drop a round, look where the balls really land, then move the bucket.',
      ru: 'Каждый шарик стартует посередине и, прежде чем упасть, расплывается волной. Куда поставить ведро? Брось раунд, посмотри, куда шарики падают на самом деле, и передвинь ведро.',
    },
    whyClassicalFails: {
      en: 'On a classical board balls pile up in the middle in a bell curve, so the middle is the obvious place. A quantum ball almost never lands there.',
      ru: 'На классической доске шарики собираются посередине колоколом, так что середина — очевидный выбор. Квантовый шарик туда почти не попадает.',
    },
    explanation: {
      en:
        'The quantum walk does not wander back and forth like a random walker: its waves run outwards and pile up at the leading edges, while the middle is mostly cancelled. ' +
        'This fast, edge-heavy spreading is what makes quantum walks useful in quantum search algorithms.',
      ru:
        'Квантовое блуждание не бродит туда-сюда, как случайный путник: его волны бегут наружу и собираются на переднем фронте, а середина в основном гасится. ' +
        'Именно такое быстрое расползание «к краям» делает квантовые блуждания полезными в алгоритмах квантового поиска.',
    },
    effects: ['quantum-walk', 'interference', 'born-rule'],
    map: LAB,
    winCondition: { type: 'plinko' },
  },
  {
    id: 'ch7-02',
    chapter: 7,
    title: { en: 'Sheep and Penguins', ru: 'Овцы и пингвины' },
    goal: {
      en: 'Find pairs that always leave together, then pairs that always split',
      ru: 'Найди пары, которые всегда выходят вместе, а потом — которые всегда расходятся',
    },
    whyClassicalFails: {
      en: 'Two ordinary marbles meeting at a half-mirror leave together or apart at random — like a coin. No classical pair does either “always”.',
      ru: 'Два обычных шарика на полупрозрачном зеркале выходят вместе или порознь наугад, как монетка. Ни одна классическая пара не делает ни то, ни другое «всегда».',
    },
    explanation: {
      en:
        'Identical sheep (bosons) cannot be told apart, so “both bounced” and “both passed” cancel: they always leave together. ' +
        'Identical penguins (fermions) get a minus sign when swapped, so only “apart” survives. Photons really do this — the Hong–Ou–Mandel dip — and electrons’ refusal to share is why matter is solid.',
      ru:
        'Одинаковых овец (бозоны) нельзя различить, поэтому варианты «обе отразились» и «обе прошли» гасят друг друга: они всегда выходят вместе. ' +
        'У одинаковых пингвинов (фермионы) перестановка даёт минус, и остаётся только «врозь». Фотоны правда так делают — это провал Хонга — У — Манделя, — а нежелание электронов делить место делает вещество твёрдым.',
    },
    effects: ['identical', 'interference'],
    map: LAB,
    winCondition: { type: 'pairs' },
  },
];
