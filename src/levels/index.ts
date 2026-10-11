import { CHAPTER_1 } from './ch1';
import type { LevelDef } from './types';

export const LEVELS: readonly LevelDef[] = [...CHAPTER_1];

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevel(id: string): LevelDef | undefined {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? LEVELS[i + 1] : undefined;
}
