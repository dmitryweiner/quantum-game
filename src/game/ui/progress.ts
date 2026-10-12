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

/** Best arcade score for a game id (0 if none or storage is blocked). */
export function bestScore(id: string): number {
  try {
    return Number(localStorage.getItem(BEST + id) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/** Saves `score` if it beats the record; returns true for a new record. */
export function saveBest(id: string, score: number): boolean {
  if (score <= bestScore(id)) return false;
  try {
    localStorage.setItem(BEST + id, String(score));
  } catch {
    // Not remembered.
  }
  return true;
}
