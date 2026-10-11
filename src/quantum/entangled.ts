import type { Rng } from './rng';

/**
 * Two qubits measured like photon polarizations: a measurement is a
 * direction θ, outcome 0 means "along θ" and 1 means "across θ"
 * (θ + 90°). Z glasses measure at 0°, X glasses at 45°.
 *
 * Every state and measurement in the game is real-valued, so real
 * amplitudes describe it exactly. The pair starts in the Bell state
 * |Φ+⟩ = (|00⟩ + |11⟩)/√2: whatever direction both sides choose, they
 * agree with probability cos²(θA − θB).
 */
export const Z_ANGLE = 0;
export const X_ANGLE = Math.PI / 4;

export type Side = 0 | 1;
export type Outcome = 0 | 1;

/** What is known about one qubit: it points along this angle (outcome 0) or across it (1). */
export interface LocalState {
  angle: number;
  outcome: Outcome;
}

export class EntangledPair {
  /** Amplitudes of |00⟩, |01⟩, |10⟩, |11⟩ (first index = side 0). */
  readonly amp = new Float64Array(4);
  /** Becomes false after the first measurement: the pair is then a product state. */
  entangled = true;
  /** Pure state of each side once it is known (after any measurement). */
  readonly local: [LocalState | null, LocalState | null] = [null, null];

  constructor() {
    this.amp[0] = Math.SQRT1_2;
    this.amp[3] = Math.SQRT1_2;
  }

  /** Probability that measuring `side` at `angle` gives 0. */
  probabilityAlong(side: Side, angle: number): number {
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    // Project onto |θ⟩ = c|0⟩ + s|1⟩ on the chosen side.
    let p = 0;
    for (let other = 0; other < 2; other++) {
      const a0 = this.amp[side === 0 ? other : other * 2]!; // that side = 0
      const a1 = this.amp[side === 0 ? 2 + other : other * 2 + 1]!; // that side = 1
      const proj = c * a0 + s * a1;
      p += proj * proj;
    }
    return p;
  }

  measure(side: Side, angle: number, rng: Rng): Outcome {
    const p0 = this.probabilityAlong(side, angle);
    const outcome: Outcome = rng.next() < p0 ? 0 : 1;
    // Basis vector for the outcome: along θ or across it (θ + 90°).
    const t = outcome === 0 ? angle : angle + Math.PI / 2;
    const [c, s] = [Math.cos(t), Math.sin(t)];
    const idx = (mine: number, other: number) => (side === 0 ? mine * 2 + other : other * 2 + mine);
    const next = new Float64Array(4);
    for (let other = 0; other < 2; other++) {
      // Amplitude left for the other side after projecting this side on |t⟩.
      const proj = c * this.amp[idx(0, other)]! + s * this.amp[idx(1, other)]!;
      next[idx(0, other)] = c * proj;
      next[idx(1, other)] = s * proj;
    }
    let norm = 0;
    for (const v of next) norm += v * v;
    const k = 1 / Math.sqrt(norm);
    for (let i = 0; i < 4; i++) this.amp[i] = next[i]! * k;

    this.local[side] = { angle, outcome };
    if (this.entangled) {
      // |Φ+⟩: the partner collapses to the very same direction and outcome.
      this.local[side === 0 ? 1 : 0] = { angle, outcome };
      this.entangled = false;
    }
    return outcome;
  }
}

// --- The CHSH game -----------------------------------------------------

/** A card from the referee: 0 = ☀️, 1 = 🌙. */
export type Card = 0 | 1;

/** How a player answers a card: a fixed answer, or look at the particle through glasses. */
export type Move = 'red' | 'blue' | 'look-z' | 'look-x';

export interface ChshStrategy {
  /** Move for each card. */
  player: Readonly<Record<Card, Move>>;
  /** Robot: measure its half of the pair (quantum) or always answer red (best classical plan). */
  robot: 'quantum' | 'always-red';
}

/** Robot's measurement angles for its two cards (±22.5°, the optimal choice). */
export const ROBOT_ANGLES: Readonly<Record<Card, number>> = { 0: Math.PI / 8, 1: -Math.PI / 8 };

/** Win iff answers are equal, except when both cards are 🌙: then they must differ. */
export const chshWins = (x: Card, y: Card, a: Outcome, b: Outcome): boolean => (a ^ b) === (x & y);

export interface ChshRound {
  x: Card;
  y: Card;
  a: Outcome;
  b: Outcome;
  win: boolean;
}

export function playChshRound(strategy: ChshStrategy, rng: Rng, cards?: [Card, Card]): ChshRound {
  const x: Card = cards?.[0] ?? (rng.next() < 0.5 ? 0 : 1);
  const y: Card = cards?.[1] ?? (rng.next() < 0.5 ? 0 : 1);
  const pair = new EntangledPair();
  const move = strategy.player[x];
  const a: Outcome =
    move === 'red'
      ? 0
      : move === 'blue'
        ? 1
        : pair.measure(0, move === 'look-z' ? Z_ANGLE : X_ANGLE, rng);
  const b: Outcome = strategy.robot === 'always-red' ? 0 : pair.measure(1, ROBOT_ANGLES[y], rng);
  return { x, y, a, b, win: chshWins(x, y, a, b) };
}

/** The best the player can do: Z for ☀️, X for 🌙, with the robot measuring its half. */
export const OPTIMAL_CHSH: ChshStrategy = {
  player: { 0: 'look-z', 1: 'look-x' },
  robot: 'quantum',
};
