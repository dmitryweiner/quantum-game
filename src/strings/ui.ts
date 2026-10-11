import { locale, type Locale } from '../i18n';

const EN = {
  title: 'Quantum Game',
  tagline: 'You are the observer. Looking changes things.',
  chapter: (n: number) => `Chapter ${n}`,
  chapterTitles: { 1: 'The Observer Effect' } as Record<number, string>,
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
  won: 'Caught it! 🎉',
  lost: 'Time’s up ⏳',
  lostText: 'The cat is still out there in a cloud of maybes. Try a different moment to look.',
  allDone: 'That’s all for now — more chapters are coming.',
  controlsTouch: 'Left thumb: walk · Right thumb: look · Lift right thumb: close eyes',
  controlsDesktop: 'WASD / arrows: walk · Mouse: look · Space or right mouse button: close eyes',
  language: 'Language',
};

type Strings = typeof EN;

const RU: Strings = {
  title: 'Quantum Game',
  tagline: 'Ты — наблюдатель. Твой взгляд меняет мир.',
  chapter: (n: number) => `Глава ${n}`,
  chapterTitles: { 1: 'Эффект наблюдателя' },
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
  won: 'Поймал! 🎉',
  lost: 'Время вышло ⏳',
  lostText: 'Кот всё ещё размазан облаком «может быть». Попробуй взглянуть в другой момент.',
  allDone: 'Пока это всё — новые главы уже в работе.',
  controlsTouch:
    'Левый палец — ходить · Правый палец — смотреть · Отпустить правый палец — закрыть глаза',
  controlsDesktop:
    'WASD / стрелки — ходить · Мышь — смотреть · Пробел или правая кнопка мыши — закрыть глаза',
  language: 'Язык',
};

const TABLES: Readonly<Record<Locale, Strings>> = { en: EN, ru: RU };

/** UI strings in the current language. */
export function T(): Strings {
  return TABLES[locale()];
}

export const STRING_TABLES = TABLES;
