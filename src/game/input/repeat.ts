/** Auto-repeat of a held button or key, as in modern falling-blocks games (ms). */
export const REPEAT = {
  /** Delayed auto-shift: the pause before repeating starts. */
  das: 170,
  /** Auto-repeat rate: the pause between repeats. */
  arr: 40,
} as const;

/** Fires at once, then again after `das` and every `arr`; returns a function that stops it. */
export function autoRepeat(fire: () => void, das: number = REPEAT.das, arr: number = REPEAT.arr) {
  fire();
  let timer = window.setTimeout(function again() {
    fire();
    timer = window.setTimeout(again, arr);
  }, das);
  return () => window.clearTimeout(timer);
}
