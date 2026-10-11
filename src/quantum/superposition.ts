import type { Lattice } from './lattice';
import { pickWeighted, type Rng } from './rng';

/** Outcome of looking at a region of the lattice. */
export type MeasureOutcome =
  /** The object was seen at this site; the state is now that site only. */
  | { kind: 'found'; site: number }
  /** The object was not in the region; its amplitude there is gone. */
  | { kind: 'absent' }
  /** Nothing to measure: the region holds no amplitude at all. */
  | { kind: 'none' };

/**
 * Wave function of one object on a lattice.
 *
 * Unobserved, it evolves as a continuous-time quantum walk:
 * i dψ/dt = -γ·A·ψ, where A is the lattice adjacency matrix and γ the hopping
 * rate. Amplitudes are complex, so spreading branches interfere; nothing
 * here is a random walk.
 *
 * Observation is a projective measurement of "is the object inside the seen
 * region?" (Born rule). A "yes" collapses onto one seen site; a "no" removes
 * the seen part and renormalizes the rest — looking at an empty spot also
 * changes the state (Renninger's negative-result measurement), and looking
 * at it all the time keeps the object out (quantum Zeno effect).
 */
export class Superposition {
  readonly re: Float64Array;
  readonly im: Float64Array;
  private readonly kRe: Float64Array[];
  private readonly kIm: Float64Array[];
  private readonly tmpRe: Float64Array;
  private readonly tmpIm: Float64Array;

  constructor(
    readonly lattice: Lattice,
    startSite: number,
    /** Hopping rate γ, in 1/s. */
    readonly hopRate: number,
  ) {
    const n = lattice.size;
    this.re = new Float64Array(n);
    this.im = new Float64Array(n);
    this.kRe = [0, 1, 2, 3].map(() => new Float64Array(n));
    this.kIm = [0, 1, 2, 3].map(() => new Float64Array(n));
    this.tmpRe = new Float64Array(n);
    this.tmpIm = new Float64Array(n);
    this.collapseTo(startSite);
  }

  probability(site: number): number {
    const a = this.re[site] ?? 0;
    const b = this.im[site] ?? 0;
    return a * a + b * b;
  }

  probabilities(): Float64Array {
    const p = new Float64Array(this.lattice.size);
    for (let i = 0; i < p.length; i++) p[i] = this.probability(i);
    return p;
  }

  /** Site holding all the probability, or -1 if the object is spread out. */
  definiteSite(eps = 1e-9): number {
    for (let i = 0; i < this.lattice.size; i++) if (this.probability(i) > 1 - eps) return i;
    return -1;
  }

  collapseTo(site: number): void {
    if (site < 0 || site >= this.lattice.size) throw new Error(`collapseTo: bad site ${site}`);
    this.re.fill(0);
    this.im.fill(0);
    this.re[site] = 1;
  }

  /** Advances the unobserved evolution by `dt` seconds (RK4 sub-steps). */
  evolve(dt: number): void {
    if (dt <= 0) return;
    const maxStep = 0.05 / Math.max(this.hopRate, 1e-9);
    const steps = Math.ceil(dt / maxStep);
    const h = dt / steps;
    for (let s = 0; s < steps; s++) this.rk4(h);
    this.normalize();
  }

  /**
   * Looks at the sites for which `seen[i]` is true.
   * Probabilities follow the Born rule; see the class comment.
   */
  measure(seen: ArrayLike<boolean>, rng: Rng): MeasureOutcome {
    const n = this.lattice.size;
    let pSeen = 0;
    const weights = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const w = seen[i] ? this.probability(i) : 0;
      weights[i] = w;
      pSeen += w;
    }
    if (pSeen < 1e-12) {
      // Clearing dust keeps an object that is really elsewhere from leaking in.
      for (let i = 0; i < n; i++) if (seen[i]) this.re[i] = this.im[i] = 0;
      if (pSeen > 0) this.normalize();
      return { kind: 'none' };
    }
    if (rng.next() < pSeen) {
      const site = pickWeighted(rng, weights);
      this.collapseTo(site);
      return { kind: 'found', site };
    }
    for (let i = 0; i < n; i++) if (seen[i]) this.re[i] = this.im[i] = 0;
    this.normalize();
    return { kind: 'absent' };
  }

  private normalize(): void {
    let sum = 0;
    for (let i = 0; i < this.lattice.size; i++) sum += this.probability(i);
    if (!(sum > 0)) throw new Error('Superposition: zero norm');
    const k = 1 / Math.sqrt(sum);
    for (let i = 0; i < this.lattice.size; i++) {
      this.re[i]! *= k;
      this.im[i]! *= k;
    }
  }

  /** out = -i·H·ψ with H = -γA, i.e. out = iγ·A·ψ. */
  private derivative(
    re: Float64Array,
    im: Float64Array,
    outRe: Float64Array,
    outIm: Float64Array,
  ): void {
    const { nbrStart, nbr, size } = this.lattice;
    const g = this.hopRate;
    for (let i = 0; i < size; i++) {
      let sr = 0;
      let si = 0;
      for (let k = nbrStart[i]!; k < nbrStart[i + 1]!; k++) {
        const j = nbr[k]!;
        sr += re[j]!;
        si += im[j]!;
      }
      // i·γ·(sr + i·si) = -γ·si + i·γ·sr
      outRe[i] = -g * si;
      outIm[i] = g * sr;
    }
  }

  private rk4(h: number): void {
    const n = this.lattice.size;
    const { re, im, kRe, kIm, tmpRe, tmpIm } = this;
    const stage = (src: number, scale: number) => {
      for (let i = 0; i < n; i++) {
        tmpRe[i] = re[i]! + scale * kRe[src]![i]!;
        tmpIm[i] = im[i]! + scale * kIm[src]![i]!;
      }
    };
    this.derivative(re, im, kRe[0]!, kIm[0]!);
    stage(0, h / 2);
    this.derivative(tmpRe, tmpIm, kRe[1]!, kIm[1]!);
    stage(1, h / 2);
    this.derivative(tmpRe, tmpIm, kRe[2]!, kIm[2]!);
    stage(2, h);
    this.derivative(tmpRe, tmpIm, kRe[3]!, kIm[3]!);
    for (let i = 0; i < n; i++) {
      re[i]! += (h / 6) * (kRe[0]![i]! + 2 * kRe[1]![i]! + 2 * kRe[2]![i]! + kRe[3]![i]!);
      im[i]! += (h / 6) * (kIm[0]![i]! + 2 * kIm[1]![i]! + 2 * kIm[2]![i]! + kIm[3]![i]!);
    }
  }
}
