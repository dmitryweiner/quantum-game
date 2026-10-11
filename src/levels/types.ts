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
  /**
   * Two-slit experiment: particles fly from the source through the slits to
   * the screen, one every second; land `hits` of them on the lamp. Stripes
   * are `spacing` rows apart under an envelope `envelope` rows wide.
   */
  | { type: 'light-lamp'; hits: number; spacing: number; envelope: number }
  /**
   * Elitzur–Vaidman bomb testing at a lab table (a panel): `boxes` boxes, of
   * which `bombs` hold live bombs. 'prove-one': prove at least one live bomb
   * without setting it off (one photon per test). 'sort-all': sort every box
   * with at most `maxBooms` explosions, using Zeno tests with up to
   * `maxPasses` passes.
   */
  | { type: 'bombs'; mode: 'prove-one'; boxes: number; bombs: number }
  | {
      type: 'bombs';
      mode: 'sort-all';
      boxes: number;
      bombs: number;
      maxBooms: number;
      maxPasses: number;
    }
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
  /**
   * Chapter opener: the level first runs with classical rules (nothing
   * spreads, nothing tunnels), so the player sees it cannot be won, then
   * switches quantum physics on (PLAN.md §1.4, «Classical mode»).
   */
  classicalIntro?: true;
  /** How far the observer can see, cells (default 4.5; 8 with `focus`). */
  gazeRange?: number;
  /** Unstable cores: radians per second of their swing towards decay (default π/10). */
  coreRate?: number;
  /** Targets are automatic detectors that click this many times per second at most. */
  detectorRate?: number;
}
