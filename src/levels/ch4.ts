import type { LevelDef } from './types';

const CATCH_GOAL = { en: 'Catch the cat 🐱 at the door 🚪', ru: 'Поймай кота 🐱 у двери 🚪' };

/** Chapter 4 — other observers: tunnelling, the Zeno effect and decoherence. */
export const CHAPTER_4: LevelDef[] = [
  {
    id: 'ch4-01',
    chapter: 4,
    title: { en: 'Through the Wall', ru: 'Сквозь стену' },
    goal: CATCH_GOAL,
    hint: {
      en:
        'The violet force field has no door, and nothing classical can pass it. But the cat’s ghost leaks into it — and a little comes out on the far side. ' +
        'Close your eyes, let the ghost seep through, then glance at the door.',
      ru:
        'В фиолетовом силовом поле нет двери, и ничто классическое сквозь него не пройдёт. Но призрак кота затекает в поле — и немного просачивается на ту сторону. ' +
        'Закрой глаза, дай призраку просочиться и взгляни на дверь.',
    },
    whyClassicalFails: {
      en: 'The field blocks the whole corridor. A classical cat would sit behind it forever.',
      ru: 'Поле перегораживает весь коридор. Классический кот сидел бы за ним вечно.',
    },
    explanation: {
      en:
        'The cat tunnelled: its wave faded inside the field but did not vanish, so part of it reached the other side. ' +
        'A field two cells thick would let almost nothing through — tunnelling dies off very steeply with thickness.',
      ru:
        'Кот протуннелировал: внутри поля его волна затухала, но не исчезала, и часть её добралась до другой стороны. ' +
        'Сквозь поле в две клетки почти ничего бы не прошло — туннелирование очень круто спадает с толщиной.',
    },
    effects: ['tunnelling', 'superposition', 'collapse'],
    classicalIntro: true,
    map: ['###########', '#c...%...D#', '#=========#', '#....@....#', '###########'],
    winCondition: { type: 'catch-at-target' },
    timeLimit: 40,
  },
  {
    id: 'ch4-02',
    chapter: 4,
    title: { en: 'Keep an Eye on It', ru: 'Не спускай глаз' },
    goal: {
      en: 'Walk to the exit 🏁 — and keep the core ☢️ from decaying',
      ru: 'Дойди до выхода 🏁 и не дай ядру ☢️ распасться',
    },
    whyClassicalFails: {
      en:
        'A classical radioactive core decays at its own pace, watched or not, and the walk is too long for it to survive. ' +
        'Only watching can hold this one back — so walk while looking at it, and mind the pillars.',
      ru:
        'Классическое радиоактивное ядро распадается в своём темпе, смотрят на него или нет, а путь слишком долгий, чтобы оно уцелело. ' +
        'Удержать это ядро может только взгляд — так что иди, глядя на него, и следи за колоннами.',
    },
    explanation: {
      en:
        'Every look found the core intact and restarted its slide towards decay, so it never got far — the quantum Zeno effect. ' +
        'Experiments have frozen real atoms this way by measuring them over and over.',
      ru:
        'Каждый взгляд заставал ядро целым и запускал его путь к распаду заново, поэтому далеко оно не уходило — квантовый эффект Зенона. ' +
        'Так в экспериментах «замораживали» настоящие атомы, измеряя их снова и снова.',
    },
    effects: ['zeno', 'collapse'],
    map: [
      '#############',
      '#n..........#',
      '#...#...#...#',
      '#@........x.#',
      '#...#...#...#',
      '#...........#',
      '#############',
    ],
    winCondition: { type: 'escape' },
    gazeRange: 11,
  },
  {
    id: 'ch4-03',
    chapter: 4,
    title: { en: 'Someone Else’s Eyes', ru: 'Чужие глаза' },
    goal: {
      en: 'Catch the cat 🐱 at the door 🚪 — only the camera 📷 can see it',
      ru: 'Поймай кота 🐱 у двери 🚪 — её видит только камера 📷',
    },
    whyClassicalFails: {
      en:
        'You cannot see the door at all. The camera can — and a camera looking is a measurement just like yours. ' +
        'Leave it on, though, and it will never let the cat reach the door.',
      ru:
        'Дверь тебе не видна совсем. Её видит камера — а взгляд камеры такое же измерение, как твой. ' +
        'Но если оставить камеру включённой, она так и не подпустит кота к двери.',
    },
    explanation: {
      en:
        'The camera collapsed the cat exactly as your eyes would: there is nothing special about a human observer. ' +
        'Anything that records where something is — a camera, a stray photon, heat — counts. That is decoherence.',
      ru:
        'Камера схлопнула кота точно так же, как это сделали бы твои глаза: человек-наблюдатель ничем не особенный. ' +
        'Считается всё, что фиксирует, где объект, — камера, случайный фотон, тепло. Это и есть декогеренция.',
    },
    effects: ['decoherence', 'collapse', 'zeno'],
    map: [
      '###############',
      '#c..........D<#',
      '###############',
      '#.........@s..#',
      '###############',
    ],
    winCondition: { type: 'catch-at-target' },
    timeLimit: 40,
  },
];
