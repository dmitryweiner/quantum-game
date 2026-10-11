import type { LevelDef } from './types';

const UNLOCK_GOAL = {
  en: 'Open the far lock 🔒: step on the plate of its ball’s colour',
  ru: 'Открой дальний замок 🔒: встань на плиту цвета его шара',
};

/** Chapter 2 — entanglement, complementary measurements and Bell's theorem. */
export const CHAPTER_2: LevelDef[] = [
  {
    id: 'ch2-01',
    chapter: 2,
    title: { en: 'Twins', ru: 'Близнецы' },
    goal: UNLOCK_GOAL,
    hint: {
      en:
        'The two balls ⚪ are entangled — see the thread between them. Neither has a colour yet. ' +
        'Look at yours: the far one, which you can never see or reach, takes the same colour at that very instant. Then step on the matching plate.',
      ru:
        'Два шара ⚪ запутаны — видишь нить между ними? Цвета пока нет ни у одного. ' +
        'Посмотри на свой: дальний шар, который не увидеть и не достать, в тот же миг получит такой же цвет. Потом встань на плиту нужного цвета.',
    },
    whyClassicalFails: {
      en:
        'The far ball is sealed behind walls: you cannot see it, and a guess is right only half the time. ' +
        'Your own ball is the only window onto it.',
      ru:
        'Дальний шар замурован: его не видно, а угадать можно лишь в половине случаев. ' +
        'Твой шар — единственное окно в ту комнату.',
    },
    explanation: {
      en:
        'Neither ball had a colour until you looked, yet the two answers always match. ' +
        'So far this could still be a trick — maybe the colours were packed in advance, like a pair of socks. Chapter 2 goes on to rule that out.',
      ru:
        'Пока ты не посмотрел, цвета не было ни у одного шара, и всё же ответы всегда совпадают. ' +
        'Пока это ещё можно списать на фокус: вдруг цвета разложили заранее, как пару носков? Дальше в главе мы это исключим.',
    },
    effects: ['entanglement', 'superposition', 'collapse'],
    map: [
      '###############',
      '#r...b#.......#',
      '#.....#...E...#',
      '#..e..#.......#',
      '#.....#...K...#',
      '#..@..#.......#',
      '###############',
    ],
    winCondition: { type: 'unlock' },
  },
  {
    id: 'ch2-02',
    chapter: 2,
    title: { en: 'Two Kinds of Glasses', ru: 'Двое очков' },
    goal: {
      en: 'Open the far lock 🔒 — this one checks green 🟩 or orange 🟧',
      ru: 'Открой дальний замок 🔒 — этот проверяет зелёный 🟩 или оранжевый 🟧',
    },
    whyClassicalFails: {
      en:
        'Through Z glasses the balls are red or blue, through X glasses green or orange — and a ball only remembers the last question. ' +
        'Look with the wrong glasses first and the link to the far ball’s green/orange is gone for good.',
      ru:
        'В очках Z шары красные или синие, в очках X — зелёные или оранжевые, и шар помнит только последний вопрос. ' +
        'Посмотришь сначала не в тех очках — связь с зелёным/оранжевым цветом дальнего шара потеряна навсегда.',
    },
    explanation: {
      en:
        'Socks packed in advance would carry both answers at once and could not care which you checked first. ' +
        'Entangled balls agree in whatever colours you ask — but asking red/blue erases green/orange. That is the first crack in the “socks” explanation.',
      ru:
        'Заранее разложенные носки несли бы оба ответа сразу, и им было бы всё равно, что ты проверил первым. ' +
        'Запутанные шары согласны в любых цветах, о которых спросишь, но вопрос «красный/синий» стирает «зелёный/оранжевый». Это первая трещина в объяснении про носки.',
    },
    effects: ['entanglement', 'complementarity', 'collapse'],
    map: [
      '###############',
      '#g...o#.......#',
      '#.....#...E...#',
      '#e....#.......#',
      '#.....#...K...#',
      '#...@.#.......#',
      '###############',
    ],
    winCondition: { type: 'unlock' },
    glasses: true,
  },
  {
    id: 'ch2-03',
    chapter: 2,
    title: { en: 'Telepathy', ru: 'Телепатия' },
    goal: {
      en: 'Win at least 80% of 400 rounds with the robot 🤖',
      ru: 'Выиграй не меньше 80% из 400 раундов вместе с роботом 🤖',
    },
    whyClassicalFails: {
      en:
        'You and the robot cannot talk once the cards are dealt. Bell proved that any plan agreed in advance wins at most 3 rounds in 4 — 75%. ' +
        'Only your halves of an entangled pair can beat that.',
      ru:
        'После раздачи карточек вы с роботом не можете общаться. Белл доказал: любой заранее оговорённый план выигрывает не больше 3 раундов из 4 — 75%. ' +
        'Обойти этот предел могут только ваши половинки запутанной пары.',
    },
    explanation: {
      en:
        'Your answers were correlated more strongly than any pre-agreed plan allows, so the particles could not have carried ready-made answers. ' +
        'This is exactly what Aspect, Clauser and Zeilinger measured with real photons — Nobel Prize in Physics, 2022.',
      ru:
        'Ваши ответы совпадали чаще, чем позволяет любой заранее оговорённый план, значит, у частиц не было готовых ответов. ' +
        'Ровно это измеряли на настоящих фотонах Аспе, Клаузер и Цайлингер — Нобелевская премия по физике 2022 года.',
    },
    effects: ['bell', 'entanglement', 'complementarity'],
    map: [
      '#############',
      '#.....#.....#',
      '#..e..#..E..#',
      '#.....#.....#',
      '#.@...J...R.#',
      '#############',
    ],
    winCondition: { type: 'chsh', rounds: 400, threshold: 0.8 },
  },
];
