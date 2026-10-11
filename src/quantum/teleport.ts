import type { Outcome } from './entangled';
import type { Rng } from './rng';

/**
 * Quantum teleportation with three real qubits (8 amplitudes):
 * q0 — the secret, q1 — your half of an entangled pair, q2 — the far half.
 * Index bit k of the amplitude array is qubit k.
 *
 * A Bell measurement of q0+q1 gives two classical bits; the far qubit is
 * then the secret up to an X flip (bit 2) and a Z flip (bit 1). Applying
 * those flips restores it exactly — the secret was never looked at, and no
 * copy was made: q0 is destroyed by the measurement (no-cloning).
 */
export class Teleporter {
  readonly amp = new Float64Array(8);
  bits: [Outcome, Outcome] | null = null;

  constructor(secretAngle: number) {
    const c = Math.cos(secretAngle);
    const s = Math.sin(secretAngle);
    // (c|0⟩ + s|1⟩)_q0 ⊗ (|00⟩ + |11⟩)/√2 on q1,q2
    const k = Math.SQRT1_2;
    this.amp[0b000] = c * k;
    this.amp[0b110] = c * k;
    this.amp[0b001] = s * k;
    this.amp[0b111] = s * k;
  }

  private cnot(control: number, target: number): void {
    const next = Float64Array.from(this.amp);
    for (let i = 0; i < 8; i++) {
      if ((i >> control) & 1) next[i ^ (1 << target)] = this.amp[i]!;
    }
    this.amp.set(next);
  }

  private hadamard(q: number): void {
    const next = new Float64Array(8);
    const k = Math.SQRT1_2;
    for (let i = 0; i < 8; i++) {
      const a = this.amp[i]!;
      const j = i ^ (1 << q);
      if ((i >> q) & 1) {
        next[j] = next[j]! + k * a;
        next[i] = next[i]! - k * a;
      } else {
        next[i] = next[i]! + k * a;
        next[j] = next[j]! + k * a;
      }
    }
    this.amp.set(next);
  }

  private measureZ(q: number, rng: Rng): Outcome {
    let p1 = 0;
    for (let i = 0; i < 8; i++) if ((i >> q) & 1) p1 += this.amp[i]! ** 2;
    const out: Outcome = rng.next() < p1 ? 1 : 0;
    let norm = 0;
    for (let i = 0; i < 8; i++) {
      if (((i >> q) & 1) !== out) this.amp[i] = 0;
      else norm += this.amp[i]! ** 2;
    }
    const f = 1 / Math.sqrt(norm);
    for (let i = 0; i < 8; i++) this.amp[i]! *= f;
    return out;
  }

  /** Bell measurement of the secret and your half: two bits, sent to the far side. */
  bellMeasure(rng: Rng): [Outcome, Outcome] {
    this.cnot(0, 1);
    this.hadamard(0);
    const zBit = this.measureZ(0, rng);
    const xBit = this.measureZ(1, rng);
    this.bits = [zBit, xBit];
    return this.bits;
  }

  /** Flip the far qubit: X swaps 0 and 1, Z flips the sign of 1. */
  flipFar(kind: 'X' | 'Z'): void {
    if (kind === 'X') {
      for (let i = 0; i < 8; i++) {
        if (!((i >> 2) & 1)) {
          const j = i | 0b100;
          const t = this.amp[i]!;
          this.amp[i] = this.amp[j]!;
          this.amp[j] = t;
        }
      }
    } else {
      for (let i = 0; i < 8; i++) if ((i >> 2) & 1) this.amp[i] = -this.amp[i]!;
    }
  }

  /** Probability that measuring the far qubit at `angle` gives 0 ("matches"). */
  farMatches(angle: number): number {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    let p = 0;
    for (let rest = 0; rest < 4; rest++) {
      const a0 = this.amp[rest]!; // q2 = 0
      const a1 = this.amp[rest | 0b100]!; // q2 = 1
      p += (c * a0 + s * a1) ** 2;
    }
    return p;
  }
}
