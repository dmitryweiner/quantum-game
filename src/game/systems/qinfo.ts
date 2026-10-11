import { X_ANGLE, Z_ANGLE, type Outcome } from '../../quantum/entangled';
import { compareSample, sendPhotons, sift, type Bb84Photon } from '../../quantum/bb84';
import type { Rng } from '../../quantum/rng';
import { Teleporter } from '../../quantum/teleport';

// --- Teleportation -------------------------------------------------------

/** The four secret colours: 🔴 🔵 (Z) and 🟢 🟠 (X), as polarization angles. */
export const SECRET_ANGLES = [
  Z_ANGLE,
  Z_ANGLE + Math.PI / 2,
  X_ANGLE,
  X_ANGLE + Math.PI / 2,
] as const;

export interface TeleportGame {
  streak: number;
  rounds: number;
  /** Index into SECRET_ANGLES — hidden from the player until the check. */
  secret: number;
  tp: Teleporter;
  bits: [Outcome, Outcome] | null;
  flips: { X: boolean; Z: boolean };
  /** The classical way: looked at the secret through Z glasses (destroys it). */
  peeked: Outcome | null;
  /** After a check: did the far ball match? */
  result: boolean | null;
}

function newSecret(rng: Rng): { secret: number; tp: Teleporter } {
  const secret = Math.floor(rng.next() * 4);
  return { secret, tp: new Teleporter(SECRET_ANGLES[secret]!) };
}

export function newTeleportGame(rounds: number, rng: Rng): TeleportGame {
  return {
    streak: 0,
    rounds,
    ...newSecret(rng),
    bits: null,
    flips: { X: false, Z: false },
    peeked: null,
    result: null,
  };
}

export function bellMeasure(g: TeleportGame, rng: Rng): void {
  if (g.bits || g.peeked !== null || g.result !== null) return;
  g.bits = g.tp.bellMeasure(rng);
}

export function toggleFlip(g: TeleportGame, kind: 'X' | 'Z'): void {
  if (!g.bits || g.result !== null) return;
  g.flips[kind] = !g.flips[kind];
  g.tp.flipFar(kind);
}

/** Classical: look at the secret through Z glasses and have the far ball made that colour. */
export function peek(g: TeleportGame, rng: Rng): void {
  if (g.bits || g.peeked !== null || g.result !== null) return;
  const angle = SECRET_ANGLES[g.secret]!;
  g.peeked = rng.next() < Math.cos(angle) ** 2 ? 0 : 1;
}

/** The judge measures the far ball in the secret's own colours. */
export function check(g: TeleportGame, rng: Rng): boolean {
  if (g.result !== null || (!g.bits && g.peeked === null)) return false;
  const angle = SECRET_ANGLES[g.secret]!;
  const pMatch =
    g.peeked !== null
      ? Math.cos(angle - (g.peeked ? Math.PI / 2 : 0)) ** 2 // far ball made as 🔴 or 🔵
      : g.tp.farMatches(angle);
  g.result = rng.next() < pMatch;
  g.streak = g.result ? g.streak + 1 : 0;
  return g.result;
}

export function nextRound(g: TeleportGame, rng: Rng): void {
  Object.assign(g, newSecret(rng), {
    bits: null,
    flips: { X: false, Z: false },
    peeked: null,
    result: null,
  });
}

// --- BB84 ----------------------------------------------------------------

export interface SpyChannel {
  spy: boolean;
  photons: Bb84Photon[] | null;
  sifted: Bb84Photon[];
  compared: { checked: number; errors: number } | null;
  /** Player's verdict, once given. */
  verdict: 'clean' | 'spy' | null;
}

export interface SpyGame {
  channels: number;
  /** Bits a message needs: you cannot compare so many that fewer are left. */
  messageBits: number;
  photonsPerChannel: number;
  correct: number;
  current: SpyChannel;
  lost: boolean;
}

const newChannel = (rng: Rng): SpyChannel => ({
  spy: rng.next() < 0.5,
  photons: null,
  sifted: [],
  compared: null,
  verdict: null,
});

export function newSpyGame(channels: number, rng: Rng): SpyGame {
  return {
    channels,
    messageBits: 4,
    photonsPerChannel: 32,
    correct: 0,
    current: newChannel(rng),
    lost: false,
  };
}

export function receive(g: SpyGame, rng: Rng): void {
  const c = g.current;
  if (c.photons) return;
  c.photons = sendPhotons(g.photonsPerChannel, c.spy, rng);
  c.sifted = sift(c.photons);
}

/** How many sifted bits may be given up for checking (the message needs the rest). */
export const maxCompare = (g: SpyGame): number =>
  Math.max(0, g.current.sifted.length - g.messageBits);

export function compare(g: SpyGame, k: number): void {
  const c = g.current;
  if (!c.photons || c.compared) return;
  c.compared = compareSample(c.sifted, Math.min(k, maxCompare(g)));
}

/** Clean → send the message; spy → drop the key. A wrong call loses the level. */
export function decide(g: SpyGame, verdict: 'clean' | 'spy'): boolean {
  const c = g.current;
  if (!c.photons || c.verdict) return false;
  c.verdict = verdict;
  const right = (verdict === 'spy') === c.spy;
  if (right) g.correct++;
  else g.lost = true;
  return right;
}

export function nextChannel(g: SpyGame, rng: Rng): void {
  g.current = newChannel(rng);
}
