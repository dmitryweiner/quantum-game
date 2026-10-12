import type { LevelDef } from './types';

/** Chapter 5 — interference: the two-slit experiment. */
export const CHAPTER_5: LevelDef[] = [
  {
    id: 'ch5-01',
    chapter: 5,
    title: { en: 'Dark Stripe', ru: 'Тёмная полоса' },
    goal: {
      en: 'Light the lamp 💡 on the screen 3 times',
      ru: 'Зажги лампу 💡 на экране 3 раза',
    },
    hint: {
      en:
        'Particles fly from the torch 🔦 through two slits, one each second, and leave dots on the screen. Watch the stripes build up: the lamp sits in a dark one. ' +
        'Look at the slits as the particles pass them — and see what happens to the stripes.',
      ru:
        'Частицы летят из фонаря 🔦 через две щели, по одной в секунду, и оставляют точки на экране. Посмотри, как проступают полосы: лампа стоит в тёмной. ' +
        'Смотри на щели, когда частицы через них пролетают, — и увидишь, что станет с полосами.',
    },
    whyClassicalFails: {
      en: 'Waves from the two slits cancel exactly where the lamp is, so nothing ever lands there. Only knowing which slit each particle used stops the cancelling.',
      ru: 'Волны от двух щелей гасят друг друга ровно там, где лампа, поэтому туда ничего не попадает. Перестанут гаснуть они, только если узнать, через какую щель прошла каждая частица.',
    },
    explanation: {
      en:
        'Each particle went through both slits at once, and the two halves of its wave cancelled at the lamp. Watching the slits told you which way it went — ' +
        'and a particle with a known path has nothing to interfere with, so the stripes disappeared and the lamp lit up.',
      ru:
        'Каждая частица шла через обе щели сразу, и две половинки её волны гасили друг друга у лампы. Взгляд на щели сообщал, куда она пошла, — ' +
        'а частице с известным путём не с чем интерферировать, поэтому полосы исчезли и лампа зажглась.',
    },
    effects: ['interference', 'collapse', 'superposition'],
    map: [
      '###################',
      '#.....#..........Z#',
      '#.....#..........Z#',
      '#.....Y..........Z#',
      '#.....#..........Z#',
      '#.....#..........Z#',
      '#S....#..........Z#',
      '#.....#..........Z#',
      '#.....#..........Z#',
      '#.....Y..........l#',
      '#.....#..........Z#',
      '#.....#..........Z#',
      '#=================#',
      '#.......@.........#',
      '###################',
    ],
    winCondition: { type: 'light-lamp', hits: 3, spacing: 6, envelope: 5 },
    timeLimit: 45,
    gazeRange: 8,
  },
];
