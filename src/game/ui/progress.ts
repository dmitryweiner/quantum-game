/** Completed level ids, remembered per browser. Storage may be unavailable. */
const KEY = 'quantum-game:completed';

export function completedLevels(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markCompleted(id: string): void {
  try {
    const done = completedLevels();
    done.add(id);
    localStorage.setItem(KEY, JSON.stringify([...done]));
  } catch {
    // Private mode or blocked storage: progress just is not kept.
  }
}

const BEST = 'quantum-game:best:';
const TABLE = 'quantum-game:scores:';
/** How many best games an arcade remembers. */
export const TABLE_SIZE = 5;

/** Which physics a game was played with (S4): one table, each entry marked ⚪ / ⚛. */
export type ScoreMode = 'quantum' | 'classical';
export interface ScoreEntry {
  score: number;
  mode: ScoreMode;
}

/** Best games of an arcade, best first. A record from before the table counts as quantum. */
export function topScores(id: string): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(TABLE + id);
    if (raw) return JSON.parse(raw) as ScoreEntry[];
    const old = Number(localStorage.getItem(BEST + id) ?? 0) || 0;
    return old > 0 ? [{ score: old, mode: 'quantum' }] : [];
  } catch {
    return [];
  }
}

/** Best arcade score for a game id (0 if none or storage is blocked). */
export function bestScore(id: string): number {
  return topScores(id)[0]?.score ?? 0;
}

/**
 * Adds a finished game to the table; returns its place (0 = new record), or
 * -1 if it did not make the table.
 */
export function addScore(id: string, score: number, mode: ScoreMode): number {
  if (score <= 0) return -1;
  const table = topScores(id);
  let place = table.findIndex((e) => score > e.score);
  if (place < 0) place = table.length;
  if (place >= TABLE_SIZE) return -1;
  table.splice(place, 0, { score, mode });
  try {
    localStorage.setItem(TABLE + id, JSON.stringify(table.slice(0, TABLE_SIZE)));
  } catch {
    // Not remembered.
  }
  return place;
}

/** Saves `score` (quantum mode); returns true for a new record. */
export function saveBest(id: string, score: number): boolean {
  return addScore(id, score, 'quantum') === 0;
}

const PLAYED = 'quantum-game:played:';

/** True until an arcade has been started once (its first game warms up classically, S4). */
export function firstPlay(id: string): boolean {
  try {
    return localStorage.getItem(PLAYED + id) === null;
  } catch {
    return false;
  }
}

export function markPlayed(id: string): void {
  try {
    localStorage.setItem(PLAYED + id, '1');
  } catch {
    // Not remembered: the warm-up shows again next time.
  }
}
