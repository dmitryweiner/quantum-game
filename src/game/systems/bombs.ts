import { machZehnder, zenoBombTest } from '../../quantum/interference';
import type { Rng } from '../../quantum/rng';

/** What the player knows about a box. */
export type BoxState =
  | 'unknown'
  /** The dark detector clicked (or a Zeno test said so): a live bomb, proven without touching it. */
  | 'proven-bomb'
  /** Proven empty (a Zeno test, or the box was opened). */
  | 'empty'
  | 'exploded';

export interface BombGame {
  /** Hidden truth: does box i hold a live bomb? */
  readonly bombs: readonly boolean[];
  state: BoxState[];
  explosions: number;
  /** Last action's outcome, for the log. */
  last: { box: number; result: BombResult } | null;
}

export type BombResult = 'boom' | 'bright' | 'dark' | 'bomb' | 'empty' | 'opened-empty';

export function newBombGame(boxes: number, bombs: number, rng: Rng): BombGame {
  const truth = Array.from({ length: boxes }, (_, i) => i < bombs);
  // Shuffle so the player cannot know which boxes are live.
  for (let i = truth.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [truth[i], truth[j]] = [truth[j]!, truth[i]!];
  }
  return { bombs: truth, state: truth.map(() => 'unknown'), explosions: 0, last: null };
}

/** Open the box and look inside — the classical check. A live bomb goes off. */
export function openBox(g: BombGame, box: number): BombResult {
  const result: BombResult = g.bombs[box] ? 'boom' : 'opened-empty';
  apply(g, box, result);
  return result;
}

/** One photon through the Mach–Zehnder interferometer with this box in an arm. */
export function testBox(g: BombGame, box: number, rng: Rng): BombResult {
  const result = machZehnder(g.bombs[box]!, rng);
  apply(g, box, result);
  return result;
}

/** One Zeno-boosted test with `passes` rounds. */
export function zenoTestBox(g: BombGame, box: number, passes: number, rng: Rng): BombResult {
  const result = zenoBombTest(g.bombs[box]!, passes, rng);
  apply(g, box, result);
  return result;
}

function apply(g: BombGame, box: number, result: BombResult): void {
  g.last = { box, result };
  if (result === 'boom') {
    g.state[box] = 'exploded';
    g.explosions++;
  } else if (result === 'dark' || result === 'bomb') g.state[box] = 'proven-bomb';
  else if (result === 'empty' || result === 'opened-empty') g.state[box] = 'empty';
  // 'bright' tells nothing: an empty box always gives it, a live one sometimes.
}

/** Live bombs proven without setting them off. */
export const provenBombs = (g: BombGame): number =>
  g.state.filter((s) => s === 'proven-bomb').length;

/** Every box is either proven, empty or gone. */
export const allSorted = (g: BombGame): boolean => g.state.every((s) => s !== 'unknown');

/** Live bombs not yet exploded or proven: still a chance to prove one. */
export const bombsLeft = (g: BombGame): number =>
  g.bombs.filter((b, i) => b && g.state[i] === 'unknown').length;
