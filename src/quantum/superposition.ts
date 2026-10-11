import type { Lattice } from './lattice';
import { gaussian, pickWeighted, type Rng } from './rng';

/** Outcome of looking at a region of the lattice. */
export type MeasureOutcome =
  /**
   * The object was seen. A sharp look leaves it on `site` only; a blurry
   * look leaves a packet around the reading, with `site` its likeliest cell.
   */
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

  /** A wave packet at rest: a Gaussian blob of width `sigma` cells around `center`. */
  setGaussian(center: { x: number; y: number }, sigma: number): void {
    const { col, row, size } = this.lattice;
    for (let i = 0; i < size; i++) {
      const d2 = (col[i]! - center.x) ** 2 + (row[i]! - center.y) ** 2;
      this.re[i] = Math.exp(-d2 / (4 * sigma * sigma));
      this.im[i] = 0;
    }
    this.normalize();
  }

  /** Mean position and its spread (cells) — how localized the object is. */
  stats(): { x: number; y: number; spread: number } {
    const { col, row, size } = this.lattice;
    let x = 0;
    let y = 0;
    for (let i = 0; i < size; i++) {
      const p = this.probability(i);
      x += p * col[i]!;
      y += p * row[i]!;
    }
    let v = 0;
    for (let i = 0; i < size; i++)
      v += this.probability(i) * ((col[i]! - x) ** 2 + (row[i]! - y) ** 2);
    return { x, y, spread: Math.sqrt(v) };
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
   *
   * `blur` is the resolution of this single look in cells. 0 is a sharp
   * look (collapse onto one cell). A blurry look is a Gaussian position
   * measurement: the reading is the true cell plus noise of width `blur`,
   * and the state is multiplied by a Gaussian of that width around the
   * reading — the less precise the look, the gentler its kick.
   */
  measure(seen: ArrayLike<boolean>, rng: Rng, blur = 0): MeasureOutcome {
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
      if (blur <= 0) {
        this.collapseTo(site);
        return { kind: 'found', site };
      }
      const { col, row } = this.lattice;
      const rx = col[site]! + blur * gaussian(rng);
      const ry = row[site]! + blur * gaussian(rng);
      let best = site;
      for (let i = 0; i < n; i++) {
        if (!seen[i]) {
          this.re[i] = this.im[i] = 0;
          continue;
        }
        const k = Math.exp(-((col[i]! - rx) ** 2 + (row[i]! - ry) ** 2) / (4 * blur * blur));
        this.re[i]! *= k;
        this.im[i]! *= k;
      }
      this.normalize();
      for (let i = 0; i < n; i++) if (this.probability(i) > this.probability(best)) best = i;
      return { kind: 'found', site: best };
    }
    for (let i = 0; i < n; i++) if (seen[i]) this.re[i] = this.im[i] = 0;
    this.normalize();
    return { kind: 'absent' };
  }

  /**
   * A blurry look: photons arrive at random, each with probability
   * `pDetect`·w(x) per call for an object at x, where w ∈ [0, 1] is how
   * well the observer sees that cell (soft-edged view). A detected photon
   * tells the position only to within `blur` cells: the state is multiplied
   * by √w and by a Gaussian of width `blur` around the reading. No photon
   * is a (very weak) negative result: the state is multiplied by √(1 − p·w).
   * Both are a proper measurement, so probabilities stay Born-rule exact.
   */
  measureSoft(
    visibility: ArrayLike<number>,
    pDetect: number,
    blur: number,
    rng: Rng,
  ): MeasureOutcome {
    const n = this.lattice.size;
    const { col, row } = this.lattice;
    const weights = new Array<number>(n);
    let pFound = 0;
    for (let i = 0; i < n; i++) {
      const w = (visibility[i] ?? 0) * this.probability(i);
      weights[i] = w;
      pFound += w;
    }
    if (pFound < 1e-12) return { kind: 'none' };
    if (rng.next() < pDetect * pFound) {
      const site = pickWeighted(rng, weights);
      if (blur <= 0) {
        this.collapseTo(site);
        return { kind: 'found', site };
      }
      const rx = col[site]! + blur * gaussian(rng);
      const ry = row[site]! + blur * gaussian(rng);
      for (let i = 0; i < n; i++) {
        const g = Math.exp(-((col[i]! - rx) ** 2 + (row[i]! - ry) ** 2) / (4 * blur * blur));
        const k = Math.sqrt(visibility[i] ?? 0) * g;
        this.re[i]! *= k;
        this.im[i]! *= k;
      }
      this.normalize();
      let best = site;
      for (let i = 0; i < n; i++) if (this.probability(i) > this.probability(best)) best = i;
      return { kind: 'found', site: best };
    }
    for (let i = 0; i < n; i++) {
      const k = Math.sqrt(Math.max(0, 1 - pDetect * (visibility[i] ?? 0)));
      this.re[i]! *= k;
      this.im[i]! *= k;
    }
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
