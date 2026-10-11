import type { EffectId } from '../strings/effects';

/** How a level is won. */
export type WinCondition =
  /** A quantum object is seen (collapses) on a target cell such as the door. */
  { type: 'catch-at-target' };

/** See PLAN.md §1.5. */
export interface LevelDef {
  /** 'ch1-03' */
  id: string;
  chapter: number;
  title: string;
  /** Short goal for the HUD. */
  goal: string;
  /** Only in the first (demo) level of a chapter. */
  hint?: string;
  /** Why a classical strategy cannot pass this level (PLAN.md §1.4.1). */
  whyClassicalFails: string;
  /** "What just happened?" text shown after winning. */
  explanation: string;
  /** Every quantum effect that shows up in the level. */
  effects: EffectId[];
  map: string[];
  winCondition: WinCondition;
  /** Seconds per attempt; no limit if absent. */
  timeLimit?: number;
  /** Hopping rate γ of quantum objects, 1/s (default 1). */
  hopRate?: number;
}
