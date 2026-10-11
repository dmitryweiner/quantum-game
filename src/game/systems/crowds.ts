import { pickWeighted, type Rng } from '../../quantum/rng';
import { beamSplitterPair, type PairResult, type ParticleKind } from '../../quantum/statistics';
import { quantumBoard } from '../../quantum/walk';

// --- Quantum Plinko --------------------------------------------------------

export interface PlinkoGame {
  slots: number;
  /** The landing chances (hidden from the player; the dots reveal them). */
  readonly odds: number[];
  /** Left slot of the 2-slot bucket. */
  bucket: number;
  balls: number;
  need: number;
  /** Where every ball so far landed, per slot (stays between rounds). */
  landed: number[];
  lastCaught: number | null;
  won: boolean;
}

export function newPlinkoGame(slots = 21, time = 3.5, balls = 24, need = 5): PlinkoGame {
  return {
    slots,
    odds: quantumBoard(slots, time),
    bucket: Math.floor(slots / 2) - 1,
    balls,
    need,
    landed: new Array<number>(slots).fill(0),
    lastCaught: null,
    won: false,
  };
}

export function moveBucket(g: PlinkoGame, left: number): void {
  g.bucket = Math.max(0, Math.min(g.slots - 2, left));
}

/** Drop a round of balls; returns how many landed in the bucket. */
export function dropRound(g: PlinkoGame, rng: Rng): number {
  let caught = 0;
  for (let i = 0; i < g.balls; i++) {
    const slot = pickWeighted(rng, g.odds);
    g.landed[slot]!++;
    if (slot === g.bucket || slot === g.bucket + 1) caught++;
  }
  g.lastCaught = caught;
  if (caught >= g.need) g.won = true;
  return caught;
}

// --- Sheep and penguins (Hong–Ou–Mandel) ----------------------------------

export type CrowdTask = 'together' | 'apart';

export interface PairGame {
  task: CrowdTask;
  kind: ParticleKind | null;
  streak: number;
  need: number;
  /** Pairs left for the current task. */
  tries: number;
  maxTries: number;
  last: PairResult | null;
  /** Tasks done so far ('together' first, then 'apart'). */
  done: CrowdTask[];
  lost: boolean;
}

export function newPairGame(need = 8, maxTries = 10): PairGame {
  return {
    task: 'together',
    kind: null,
    streak: 0,
    need,
    tries: maxTries,
    maxTries,
    last: null,
    done: [],
    lost: false,
  };
}

export function chooseKind(g: PairGame, kind: ParticleKind): void {
  g.kind = kind;
  g.streak = 0;
}

const fits = (task: CrowdTask, r: PairResult) => (task === 'apart' ? r === 'apart' : r !== 'apart');

/** Send one pair to the splitter; a miss resets the streak. */
export function sendPair(g: PairGame, rng: Rng): PairResult | null {
  if (!g.kind || g.lost || g.done.length === 2) return null;
  const r = beamSplitterPair(g.kind, rng);
  g.last = r;
  g.tries--;
  g.streak = fits(g.task, r) ? g.streak + 1 : 0;
  if (g.streak >= g.need) {
    g.done.push(g.task);
    if (g.task === 'together') {
      g.task = 'apart';
      g.kind = null;
      g.streak = 0;
      g.tries = g.maxTries;
      g.last = null;
    }
  } else if (g.tries <= 0) g.lost = true;
  return r;
}
