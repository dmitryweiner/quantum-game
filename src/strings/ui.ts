import { locale, type Locale } from '../i18n';

const EN = {
  title: 'Quantum Game',
  tagline: 'You are the observer. Looking changes things.',
  chapter: (n: number) => `Chapter ${n}`,
  chapterTitles: { 1: 'The Observer Effect', 2: 'Spooky Action' } as Record<number, string>,
  sandbox: 'Sandbox',
  sandboxNote: 'Free play, no goal',
  start: 'Start',
  retry: 'Try again',
  next: 'Next level',
  menu: 'Levels',
  close: 'Close',
  learnMore: 'ℹ️ Learn more',
  learnMoreTitle: 'Quantum effects in this level',
  whyClassicalFails: 'Why you need quantum here',
  whatHappened: 'What just happened?',
  won: {
    'catch-at-target': 'Caught it! 🎉',
    unlock: 'Unlocked! 🔓',
    chsh: 'Telepathy confirmed! 🎉',
  },
  lost: 'Time’s up ⏳',
  lostText: 'The cat is still out there in a cloud of maybes. Try a different moment to look.',
  allDone: 'That’s all for now — more chapters are coming.',
  controlsTouch: 'Left thumb: walk · Right thumb: look · Lift right thumb: close eyes',
  controlsDesktop: 'WASD / arrows: walk · Mouse: look · Space or right mouse button: close eyes',
  language: 'Language',
  glasses: (b: string) => `👓 ${b}`,
  glassesHint: 'Glasses: Z shows 🔴/🔵, X shows 🟢/🟠 (button or Q)',
  lostWrongColour: 'The lock stayed shut 🔒',
  lostWrongColourText:
    'The far ball turned out a different colour. Remember: it has no colour until something looks — make sure your ball tells you the right one.',
  chsh: {
    rules:
      'Each round the judge 🧑‍⚖️ deals you and the robot 🤖 a card: ☀️ or 🌙. You do not see the robot’s card and cannot talk. ' +
      'Each of you answers 🔴 or 🔵. You win the round if your answers match — except when both cards are 🌙: then they must differ.',
    byHand: '1. Try a few rounds by hand',
    yourCard: (card: string) => `Your card: ${card}`,
    moveRed: 'Say 🔴',
    moveBlue: 'Say 🔵',
    moveZ: 'Look via Z 👓',
    moveX: 'Look via X 👓',
    roundResult: (you: string, robot: string, robotCard: string, win: boolean, need: string) =>
      `${win ? '✅' : '❌'} You said ${you}; the robot had ${robotCard} and said ${robot}. Needed: ${need}.`,
    needSame: 'same',
    needDifferent: 'different',
    tally: (won: number, played: number) => `Won ${won} of ${played}`,
    plan: '2. Agree on a plan and play 400 rounds',
    forCard: (card: string) => `On ${card}:`,
    robotPlan: 'Robot:',
    robotQuantum: 'Measures its particle (±22.5°)',
    robotClassical: 'Always says 🔴',
    run: (n: number) => `▶ Play ${n} rounds`,
    running: (done: number, n: number) => `Playing… ${done} / ${n}`,
    result: (won: number, n: number) => `Won ${won} of ${n} = ${((100 * won) / n).toFixed(1)}%`,
    target: (p: number) => `target ≥ ${Math.round(p * 100)}%`,
    breakdown: 'Wins by cards (you / robot)',
    classicalLimit: 'No pre-agreed plan can beat 75% on average.',
  },
};

type Strings = typeof EN;

const RU: Strings = {
  title: 'Quantum Game',
  tagline: 'Ты — наблюдатель. Твой взгляд меняет мир.',
  chapter: (n: number) => `Глава ${n}`,
  chapterTitles: { 1: 'Эффект наблюдателя', 2: 'Жуткое дальнодействие' },
  sandbox: 'Песочница',
  sandboxNote: 'Свободная игра без цели',
  start: 'Начать',
  retry: 'Ещё раз',
  next: 'Следующий уровень',
  menu: 'Уровни',
  close: 'Закрыть',
  learnMore: 'ℹ️ Подробнее',
  learnMoreTitle: 'Квантовые эффекты на этом уровне',
  whyClassicalFails: 'Зачем здесь квантовая физика',
  whatHappened: 'Что сейчас произошло?',
  won: {
    'catch-at-target': 'Поймал! 🎉',
    unlock: 'Открыто! 🔓',
    chsh: 'Телепатия подтверждена! 🎉',
  },
  lost: 'Время вышло ⏳',
  lostText: 'Кот всё ещё размазан облаком «может быть». Попробуй взглянуть в другой момент.',
  allDone: 'Пока это всё — новые главы уже в работе.',
  controlsTouch:
    'Левый палец — ходить · Правый палец — смотреть · Отпустить правый палец — закрыть глаза',
  controlsDesktop:
    'WASD / стрелки — ходить · Мышь — смотреть · Пробел или правая кнопка мыши — закрыть глаза',
  language: 'Язык',
  glasses: (b: string) => `👓 ${b}`,
  glassesHint: 'Очки: в Z шары 🔴/🔵, в X — 🟢/🟠 (кнопка или Q)',
  lostWrongColour: 'Замок не открылся 🔒',
  lostWrongColourText:
    'Дальний шар оказался другого цвета. Помни: цвета нет, пока кто-нибудь не посмотрит, — убедись, что твой шар подсказывает нужный.',
  chsh: {
    rules:
      'В каждом раунде судья 🧑‍⚖️ раздаёт тебе и роботу 🤖 по карточке: ☀️ или 🌙. Карточку робота ты не видишь, переговариваться нельзя. ' +
      'Каждый отвечает 🔴 или 🔵. Раунд выигран, если ответы совпали, — кроме случая, когда у обоих 🌙: тогда ответы должны различаться.',
    byHand: '1. Сыграй несколько раундов вручную',
    yourCard: (card: string) => `Твоя карточка: ${card}`,
    moveRed: 'Ответить 🔴',
    moveBlue: 'Ответить 🔵',
    moveZ: 'Взглянуть в Z 👓',
    moveX: 'Взглянуть в X 👓',
    roundResult: (you: string, robot: string, robotCard: string, win: boolean, need: string) =>
      `${win ? '✅' : '❌'} Ты ответил ${you}; у робота была ${robotCard}, он ответил ${robot}. Нужно было: ${need}.`,
    needSame: 'одинаково',
    needDifferent: 'по-разному',
    tally: (won: number, played: number) => `Выиграно ${won} из ${played}`,
    plan: '2. Договоритесь о плане и сыграйте 400 раундов',
    forCard: (card: string) => `На ${card}:`,
    robotPlan: 'Робот:',
    robotQuantum: 'Измеряет свою частицу (±22,5°)',
    robotClassical: 'Всегда отвечает 🔴',
    run: (n: number) => `▶ Сыграть ${n} раундов`,
    running: (done: number, n: number) => `Играем… ${done} / ${n}`,
    result: (won: number, n: number) =>
      `Выиграно ${won} из ${n} = ${((100 * won) / n).toFixed(1).replace('.', ',')}%`,
    target: (p: number) => `нужно ≥ ${Math.round(p * 100)}%`,
    breakdown: 'Победы по карточкам (ты / робот)',
    classicalLimit: 'Ни один заранее оговорённый план не даёт в среднем больше 75%.',
  },
};

const TABLES: Readonly<Record<Locale, Strings>> = { en: EN, ru: RU };

/** UI strings in the current language. */
export function T(): Strings {
  return TABLES[locale()];
}

export const STRING_TABLES = TABLES;
