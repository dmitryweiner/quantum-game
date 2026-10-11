import type { Basis } from '../../levels/map';
import { X_ANGLE, type EntangledPair } from '../../quantum/entangled';
import { BASIS_ANGLE, type Lamp } from './LevelSim';

/** Ball colours: Z glasses show red/blue, X glasses green/orange. */
const COLOURS = { Z: ['🔴', '🔵'], X: ['🟢', '🟠'] } as const;

/** The ball's emoji for what is known about it, or ⚪ while it has no colour. */
export function qubitEmoji(pair: EntangledPair, side: 0 | 1): string {
  const s = pair.local[side];
  if (!s) return '⚪';
  return COLOURS[Math.abs(s.angle - X_ANGLE) < 1e-9 ? 'X' : 'Z'][s.outcome];
}

/** What a lamp shows through the current glasses: a definite state, or null if it is a toss-up. */
export function lampLook(lamp: Lamp, glasses: Basis): 'on' | 'off' | 'plus' | 'minus' | null {
  const o = lamp.q.definiteAt(BASIS_ANGLE[glasses]);
  if (o === null) return null;
  if (glasses === 'Z') return o === 0 ? 'on' : 'off';
  return o === 0 ? 'plus' : 'minus';
}
