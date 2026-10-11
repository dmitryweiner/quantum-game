import type { LevelDef } from './types';

const LAB = [
  '###########',
  '#.........#',
  '#..R...J..#',
  '#.........#',
  '#....@....#',
  '###########',
];

/** Chapter 6 — quantum information: teleportation and quantum cryptography. */
export const CHAPTER_6: LevelDef[] = [
  {
    id: 'ch6-01',
    chapter: 6,
    title: { en: 'Teleporter', ru: 'Телепорт' },
    goal: {
      en: 'Send the hidden colour 🎁 into the sealed room — 5 times in a row',
      ru: 'Передай спрятанный цвет 🎁 в запертую комнату — 5 раз подряд',
    },
    hint: {
      en:
        'The secret ball is red, blue, green or orange — you are not told which. Peeking with Z glasses only works for red and blue. ' +
        'Instead: make a Bell measurement of the secret with your half of an entangled pair, read the two bits, and flip the far ball accordingly.',
      ru:
        'Секретный шар красный, синий, зелёный или оранжевый — какой, тебе не говорят. Подглядывание в очках Z работает только для красного и синего. ' +
        'Вместо этого сделай измерение Белла секрета вместе со своей половинкой запутанной пары, прочитай два бита и переверни дальний шар по ним.',
    },
    whyClassicalFails: {
      en: 'A quantum state cannot be copied, and looking at it only tells you one answer — and destroys the rest. Looking and telling works 3 times out of 4, so five in a row is unlikely.',
      ru: 'Квантовое состояние нельзя скопировать, а взгляд даёт лишь один ответ и разрушает остальное. «Посмотреть и сказать» срабатывает в 3 случаях из 4, так что пять раз подряд — маловероятно.',
    },
    explanation: {
      en:
        'The Bell measurement mixed the secret into the entangled pair and gave two ordinary bits. Those bits told you which of four simple flips turns the far ball into the secret — ' +
        'exactly, without anyone ever learning its colour. The original was destroyed on the way: teleporting is moving, not copying.',
      ru:
        'Измерение Белла «вмешало» секрет в запутанную пару и выдало два обычных бита. Они подсказали, какой из четырёх простых переворотов превращает дальний шар в секрет — ' +
        'в точности, хотя никто так и не узнал его цвет. Оригинал по дороге разрушился: телепортация — это перенос, а не копирование.',
    },
    effects: ['teleportation', 'entanglement', 'complementarity'],
    map: LAB,
    winCondition: { type: 'teleport', rounds: 5 },
  },
  {
    id: 'ch6-02',
    chapter: 6,
    title: { en: 'Spy on the Line', ru: 'Шпион на линии' },
    goal: {
      en: 'Judge 3 lines in a row: send the secret, or catch the spy 🕵️',
      ru: 'Оцени 3 линии подряд: отправь секрет или поймай шпиона 🕵️',
    },
    whyClassicalFails: {
      en: 'Ordinary bits can be copied without a trace — a spy on a classical line is invisible. Photons cannot be copied, and a spy who looks leaves errors behind.',
      ru: 'Обычные биты можно скопировать бесследно — шпион на классической линии невидим. Фотоны скопировать нельзя, и шпион, который смотрит, оставляет ошибки.',
    },
    explanation: {
      en:
        'Where your glasses matched the robot’s, your bits had to agree. A spy had to guess the glasses for every photon and, when wrong, scrambled it — ' +
        'about one bit in four. Giving up a few bits to compare in public was enough to see her.',
      ru:
        'Там, где твои очки совпали с очками робота, биты обязаны были совпасть. Шпиону приходилось угадывать очки для каждого фотона, и, ошибаясь, он их портил — ' +
        'примерно каждый четвёртый бит. Пожертвовать несколькими битами для открытой сверки было достаточно, чтобы его заметить.',
    },
    effects: ['qkd', 'complementarity', 'collapse'],
    map: LAB,
    winCondition: { type: 'spy', channels: 3 },
  },
];
