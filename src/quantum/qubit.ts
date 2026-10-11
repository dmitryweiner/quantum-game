import type { Outcome } from './entangled';
import type { Rng } from './rng';

/**
 * A single qubit measured like a polarization (see entangled.ts): its state
 * is a direction θ, |θ⟩ = cos θ|0⟩ + sin θ|1⟩. Measuring at angle φ gives 0
 * with probability cos²(θ − φ) and leaves the qubit along φ or across it.
 */
export class Qubit {
  constructor(public angle: number) {}

  probabilityAlong(phi: number): number {
    return Math.cos(this.angle - phi) ** 2;
  }

  measure(phi: number, rng: Rng): Outcome {
    const outcome: Outcome = rng.next() < this.probabilityAlong(phi) ? 0 : 1;
    this.angle = outcome === 0 ? phi : phi + Math.PI / 2;
    return outcome;
  }

  /** The outcome this qubit would give at `phi` for sure, or null if it is a toss-up. */
  definiteAt(phi: number, eps = 1e-9): Outcome | null {
    const p = this.probabilityAlong(phi);
    return p > 1 - eps ? 0 : p < eps ? 1 : null;
  }
}

/**
 * Two-level system that swings between |0⟩ and |1⟩ on its own (a Rabi
 * oscillation): unobserved, its angle grows as ωt, so the chance of finding
 * it in |1⟩ is sin²(ωt). Each look collapses it to 0 or π/2 — so frequent
 * looks keep resetting it (quantum Zeno effect). PLAN.md §4.1, «Зенон».
 */
export class RabiSystem {
  /** Angle θ: amplitude cos θ for |0⟩, sin θ for |1⟩. */
  angle = 0;

  constructor(
    /** ω, radians per second. */
    readonly rate: number,
  ) {}

  evolve(dt: number): void {
    this.angle = (this.angle + this.rate * dt) % Math.PI;
  }

  /** Probability of finding the system in |1⟩. */
  get p1(): number {
    return Math.sin(this.angle) ** 2;
  }

  measure(rng: Rng): Outcome {
    const outcome: Outcome = rng.next() < this.p1 ? 1 : 0;
    this.angle = outcome === 1 ? Math.PI / 2 : 0;
    return outcome;
  }
}
