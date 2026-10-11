import type { Text } from '../i18n';
import type { EffectId } from '../strings/effects';

/** How a level is won. */
export type WinCondition =
  /** A quantum object is seen (collapses) on a target cell such as the door. */
  | { type: 'catch-at-target' }
  /** Step on the plate whose colour matches the far ball, as the lock measures it. */
  | { type: 'unlock' }
  /**
   * Watch the atom for `look` seconds, then the lights go out for `dark`
   * seconds; a detector then checks that the atom is still in the ring.
   * Must succeed `rounds` times in a row.
   */
  | { type: 'zone-after-dark'; look: number; dark: number; rounds: number }
  /** Reach the exit 🏁; every core ☢️ must still be intact when checked there. */
  | { type: 'escape' }
  /** CHSH game with a robot: win at least `threshold` of `rounds` rounds. */
  | { type: 'chsh'; rounds: number; threshold: number };

/** See PLAN.md §1.5. */
export interface LevelDef {
  /** 'ch1-03' */
  id: string;
  chapter: number;
  title: Text;
  /** Short goal for the HUD. */
  goal: Text;
  /** Only in the first (demo) level of a chapter. */
  hint?: Text;
  /** Why a classical strategy cannot pass this level (PLAN.md §1.4.1). */
  whyClassicalFails: Text;
  /** "What just happened?" text shown after winning. */
  explanation: Text;
  /** Every quantum effect that shows up in the level. */
  effects: EffectId[];
  map: string[];
  winCondition: WinCondition;
  /** Seconds per attempt; no limit if absent. */
  timeLimit?: number;
  /** Hopping rate γ of quantum objects, 1/s (default 1). */
  hopRate?: number;
  /** The player can switch glasses between Z and X. */
  glasses?: boolean;
  /** The player can change how sharp (narrow) or blurry (wide) the look is. */
  focus?: boolean;
  /** Show only this many central cells (the rest of a big room is off-screen). */
  view?: { cols: number; rows: number };
  /** How far the observer can see, cells (default 4.5; 8 with `focus`). */
  gazeRange?: number;
  /** Unstable cores: radians per second of their swing towards decay (default π/10). */
  coreRate?: number;
  /** Targets are automatic detectors that click this many times per second at most. */
  detectorRate?: number;
}
