import { levelById } from '../levels';

/** Ids of the arcade games and the scenes that play them. */
export const ARCADE_SCENES: Readonly<Record<string, string>> = {
  'arcade:snake': 'Snake',
  'arcade:invaders': 'Invaders',
  'arcade:quantris': 'Quantris',
};

/** Short names in the address (#snake) for the arcades; levels use their ids (#ch1-02). */
export const HASH_OF: Readonly<Record<string, string>> = {
  'arcade:snake': 'snake',
  'arcade:invaders': 'invaders',
  'arcade:quantris': 'quantris',
};
/** Accepted spellings of each hash, including older names. */
const FROM_HASH: Readonly<Record<string, string>> = {
  snake: 'arcade:snake',
  invaders: 'arcade:invaders',
  // The starships became the invaders: old links still work.
  ships: 'arcade:invaders',
  tanks: 'arcade:invaders',
  quantris: 'arcade:quantris',
  tetris: 'arcade:quantris',
};

/** A menu id (level id, 'sandbox' or 'arcade:…') from a URL hash, or null. */
export function idFromHash(hash: string): string | null {
  const h = decodeURIComponent(hash.replace(/^#/, '')).trim().toLowerCase();
  if (!h) return null;
  if (FROM_HASH[h]) return FROM_HASH[h];
  if (ARCADE_SCENES[h]) return h;
  if (h === 'sandbox' || levelById(h)) return h;
  return null;
}
