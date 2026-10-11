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
