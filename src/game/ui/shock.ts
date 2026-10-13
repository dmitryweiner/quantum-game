import type { Paradox, ParadoxKind, ParadoxLog } from '../../arcade/paradox';
import { T } from '../../strings/ui';
import { play, type SoundName } from '../audio';
import { ui } from './index';
import { addScore, topScores, type ScoreMode } from './progress';

/** Each paradox has its own stinger (S10). */
const SOUND: Readonly<Record<ParadoxKind, SoundName>> = {
  far: 'wow',
  rare: 'chime',
  negative: 'pop',
  zeno: 'freeze',
  tunnel: 'whoosh',
  spooky: 'chime',
};

export function paradoxText(p: Paradox): string {
  const t = T().arcade.paradox;
  const pct = Math.round(p.value * 100);
  switch (p.kind) {
    case 'far':
      return t.far(p.value);
    case 'rare':
      return t.rare(pct);
    case 'negative':
      return t.negative(pct);
    case 'zeno':
      return t.zeno;
    case 'tunnel':
      return t.tunnel;
    case 'spooky':
      return t.spooky(p.value);
  }
}

/**
 * Logs a paradox and, unless one was just shown, captions it with a toast
 * and its sound (S2, S10). Returns true if it was shown.
 */
export function announce(log: ParadoxLog, p: Paradox): boolean {
  if (!log.add(p, performance.now() / 1000)) return false;
  ui().toast(paradoxText(p));
  play(SOUND[p.kind]);
  return true;
}

/** Saves the score in the arcade's table and shows the game-over screen with the paradoxes seen (S3). */
export function finishArcade(
  id: string,
  score: number,
  mode: ScoreMode,
  log: ParadoxLog | null,
  onAgain: () => void,
  onMenu: () => void,
): void {
  const place = addScore(id, score, mode);
  ui().showArcadeOver(
    { score, table: topScores(id), place, paradoxes: log?.breakdown() ?? [] },
    onAgain,
    onMenu,
  );
}
