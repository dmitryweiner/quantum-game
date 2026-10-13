import { T } from '../../strings/ui';
import { play } from '../audio';
import { ui } from './index';
import { firstPlay, markPlayed, type ScoreMode } from './progress';

/** Seconds of classical physics at the start of an arcade's very first game (S4). */
export const WARMUP_SECONDS = 15;

/**
 * Classical or quantum physics for an arcade (S4). The very first quantum
 * game starts classical for a while, then quantum switches on in front of
 * the player — the world "breaks" and there is something to compare with.
 */
export class ArcadeMode {
  /** The table mark of this game: quantum if quantum was on at any point. */
  mode: ScoreMode = 'quantum';
  private warmup = 0;

  constructor(
    private readonly id: string,
    private readonly setClassical: (on: boolean) => void,
  ) {}

  start(mode: ScoreMode): void {
    this.mode = mode;
    this.warmup = 0;
    if (mode === 'quantum' && firstPlay(this.id)) {
      this.warmup = WARMUP_SECONDS;
      this.setClassical(true);
      ui().setClassicalBanner(() => this.quantumOn());
      ui().revealQuantumSwitch();
    } else this.setClassical(mode === 'classical');
    markPlayed(this.id);
  }

  update(dt: number): void {
    if (this.warmup <= 0) return;
    this.warmup -= dt;
    if (this.warmup <= 0) this.quantumOn();
  }

  private quantumOn(): void {
    this.warmup = 0;
    this.setClassical(false);
    ui().setClassicalBanner(null);
    ui().toast(T().arcade.quantumOn);
    play('wow');
  }
}
