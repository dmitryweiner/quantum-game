import type { LevelDef } from './types';

/**
 * A walled room with the atom (A) in the middle of a ring of radius `r`
 * (u cells) and the player (@) just below the ring.
 */
function ringRoom(cols: number, rows: number, r: number): string[] {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) return '#';
      if (x === cx && y === cy) return 'A';
      if (x === cx && y === cy + r + 1) return '@';
      return Math.hypot(x - cx, y - cy) <= r ? 'u' : '.';
    }).join(''),
  );
}

/** Chapter 3 — the uncertainty principle: a sharp look kicks, a blurry look is gentle. */
export const CHAPTER_3: LevelDef[] = [
  {
    id: 'ch3-01',
    chapter: 3,
    title: { en: 'Kick Start', ru: 'Пинок взглядом' },
    goal: {
      en: 'Send the atom ⚛️ to the detector 🎯 — it clicks by itself',
      ru: 'Отправь атом ⚛️ к детектору 🎯 — он сработает сам',
    },
    hint: {
      en:
        'The atom is a lazy, wide cloud — it will not get anywhere by itself. Make your look sharp (narrow cone) and glance at it: ' +
        'pinning it to one spot gives it a wild, unknown speed. Then look away and let the detector catch it.',
      ru:
        'Атом — ленивое широкое облако, сам он никуда не доберётся. Сделай взгляд острым (узкий конус) и взгляни на него: ' +
        'зажатый в одной точке, он получает бешеную неизвестную скорость. Потом отведи глаза — детектор поймает его сам.',
    },
    whyClassicalFails: {
      en:
        'A resting atom stays at rest, and you cannot touch it. The only way to speed it up is to pin down where it is — ' +
        'the more precisely you know its position, the less you know its speed.',
      ru:
        'Покоящийся атом так и будет покоиться, а трогать его нельзя. Разогнать его можно только одним способом — точно узнать, где он: ' +
        'чем точнее известно положение, тем меньше известно о скорости.',
    },
    explanation: {
      en:
        'Your sharp look squeezed the atom into one cell. A wave that narrow is made of many different speeds at once, ' +
        'so it burst out in all directions — Heisenberg’s uncertainty principle at work.',
      ru:
        'Острый взгляд сжал атом в одну клетку. Такая узкая волна состоит сразу из множества разных скоростей, ' +
        'поэтому атом разлетелся во все стороны. Так работает принцип неопределённости Гейзенберга.',
    },
    effects: ['uncertainty', 'superposition', 'collapse'],
    classicalIntro: true,
    map: [
      '#####################',
      '#a................TT#',
      '#===================#',
      '#.........@.........#',
      '#####################',
    ],
    winCondition: { type: 'catch-at-target' },
    timeLimit: 14,
    focus: true,
    detectorRate: 8,
  },
  {
    id: 'ch3-02',
    chapter: 3,
    title: { en: 'Soft Touch', ru: 'Мягкое касание' },
    goal: {
      en: 'Watch the atom ⚛️, then keep it inside the ring through the dark — twice in a row',
      ru: 'Посмотри на атом ⚛️ и сохрани его в кольце, пока темно, — два раза подряд',
    },
    whyClassicalFails: {
      en:
        'You must look at the atom long enough to know it is there; then it sits in the dark until the detector checks. ' +
        'A sharp look tells you exactly where it is — and kicks it out of the ring.',
      ru:
        'На атом нужно посмотреть достаточно долго, чтобы убедиться, что он на месте; потом он остаётся в темноте до проверки детектором. ' +
        'Острый взгляд точно скажет, где атом, но вышибет его из кольца.',
    },
    explanation: {
      en:
        'A blurry look only learnt roughly where the atom was, so it barely disturbed its speed and the atom stayed put. ' +
        'This is Heisenberg’s microscope: to see something more sharply you must hit it harder.',
      ru:
        'Размытый взгляд узнал положение атома лишь примерно, поэтому почти не изменил его скорость, и атом остался на месте. ' +
        'Это «микроскоп Гейзенберга»: чтобы рассмотреть что-то чётче, его приходится сильнее толкнуть.',
    },
    effects: ['uncertainty', 'collapse', 'zeno'],
    map: ringRoom(31, 31, 7),
    winCondition: { type: 'zone-after-dark', look: 2, dark: 5, rounds: 2 },
    // The room is big so walls do not bounce the atom back; show its middle.
    view: { cols: 19, rows: 19 },
    focus: true,
  },
];
