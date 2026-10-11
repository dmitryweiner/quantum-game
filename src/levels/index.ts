import { CHAPTER_1 } from './ch1';
import { CHAPTER_2 } from './ch2';
import { CHAPTER_3 } from './ch3';
import { CHAPTER_4 } from './ch4';
import { CHAPTER_5 } from './ch5';
import { CHAPTER_6 } from './ch6';
import type { LevelDef } from './types';

export const LEVELS: readonly LevelDef[] = [
  ...CHAPTER_1,
  ...CHAPTER_2,
  ...CHAPTER_3,
  ...CHAPTER_4,
  ...CHAPTER_5,
  ...CHAPTER_6,
];

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevel(id: string): LevelDef | undefined {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? LEVELS[i + 1] : undefined;
}
