import type { LevelDef } from '../../levels/types';
import { mulberry32 } from '../../quantum/rng';
import { zenoSurvival } from '../../quantum/interference';
import { T } from '../../strings/ui';
import {
  allSorted,
  bombsLeft,
  newBombGame,
  openBox,
  provenBombs,
  testBox,
  zenoTestBox,
  type BombGame,
  type BoxState,
} from '../systems/bombs';
import { play } from '../audio';
import { h } from './dom';

/** Everything the panel remembers between redraws (e.g. a language switch). */
export interface BombPanelState {
  game: BombGame;
  selected: number;
  passes: number;
  done: boolean;
}

export function newBombPanelState(level: LevelDef): BombPanelState {
  const cond = level.winCondition;
  if (cond.type !== 'bombs') throw new Error('not a bomb level');
  const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
  return { game: newBombGame(cond.boxes, cond.bombs, rng), selected: 0, passes: 1, done: false };
}

const BOX_FACE: Readonly<Record<BoxState, string>> = {
  unknown: '📦',
  'proven-bomb': '💣',
  empty: '⚪',
  exploded: '💥',
};

/**
 * The lab table for the Elitzur–Vaidman levels: pick a box, then test it with
 * a photon (or open it — the classical way). Reports a win or a loss once.
 */
export function bombPanel(
  level: LevelDef,
  state: BombPanelState,
  on: { rerender: () => void; won: () => void; lost: () => void },
): HTMLElement {
  const cond = level.winCondition;
  if (cond.type !== 'bombs') throw new Error('not a bomb level');
  const b = T().bombs;
  const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
  const { game } = state;
  const zeno = cond.mode === 'sort-all';

  const finish = (won: boolean) => {
    state.done = true;
    if (won) on.won();
    else on.lost();
  };
  const check = () => {
    if (state.done) return;
    if (cond.mode === 'prove-one') {
      if (provenBombs(game) >= 1) finish(true);
      else if (bombsLeft(game) === 0) finish(false);
    } else if (game.explosions > cond.maxBooms) finish(false);
    else if (allSorted(game)) finish(true);
  };

  const act = (fn: () => void) => () => {
    if (state.done || game.state[state.selected] !== 'unknown') return;
    fn();
    const r = game.last?.result;
    if (r === 'boom') play('boom');
    else if (r === 'dark' || r === 'bomb') play('lamp');
    else play('tick');
    on.rerender();
    check();
  };

  const boxes = h(
    'div',
    { class: 'boxes' },
    ...game.state.map((st, i) =>
      h(
        'button',
        {
          class: i === state.selected ? 'btn box selected' : 'btn box',
          'aria-pressed': String(i === state.selected),
          onclick: () => {
            state.selected = i;
            on.rerender();
          },
        },
        h('span', { class: 'box-face' }, BOX_FACE[st]),
        h('span', { class: 'box-label' }, b.box(i)),
      ),
    ),
  );

  const canAct = !state.done && game.state[state.selected] === 'unknown';
  const disabled = canAct ? {} : { disabled: '' };

  return h(
    'div',
    {},
    h('p', { class: 'muted' }, zeno ? b.tableZeno : b.table),
    boxes,
    zeno && passesControl(state, cond.maxPasses, on.rerender),
    h(
      'div',
      { class: 'choices' },
      h(
        'button',
        {
          class: 'btn primary',
          ...disabled,
          onclick: act(() =>
            zeno
              ? zenoTestBox(game, state.selected, state.passes, rng)
              : testBox(game, state.selected, rng),
          ),
        },
        h('span', { class: 'test-label' }, zeno ? b.testZeno(state.passes) : b.test),
      ),
      h(
        'button',
        { class: 'btn', ...disabled, onclick: act(() => openBox(game, state.selected)) },
        b.open,
      ),
    ),
    game.last &&
      h('p', { class: 'big' }, `${b.box(game.last.box)}: ${b.result[game.last.result] ?? ''}`),
    h(
      'p',
      { class: 'muted' },
      cond.mode === 'prove-one'
        ? b.progressProve(provenBombs(game))
        : b.progressSort(
            game.state.filter((s) => s !== 'unknown').length,
            game.state.length,
            game.explosions,
            cond.maxBooms,
          ),
    ),
  );
}

/**
 * The N slider. Dragging only updates the texts in place (re-creating the
 * input mid-drag would drop the finger); the panel redraws when it is let go.
 */
function passesControl(state: BombPanelState, max: number, rerender: () => void): HTMLElement {
  const b = T().bombs;
  const pct = (p: number) => `${Math.round(p * 100)}%`;
  const label = h('span', { class: 'plan-label' }, b.passes(state.passes));
  const odds = h('span', { class: 'muted' }, b.survival(pct(zenoSurvival(state.passes))));
  const input = h('input', {
    type: 'range',
    min: '1',
    max: String(max),
    step: '1',
    value: String(state.passes),
    class: 'passes-range',
    oninput: () => {
      state.passes = Number(input.value);
      label.textContent = b.passes(state.passes);
      odds.textContent = b.survival(pct(zenoSurvival(state.passes)));
      const test = input.closest('.panel')?.querySelector('.test-label');
      if (test) test.textContent = b.testZeno(state.passes);
    },
    onchange: () => rerender(),
  });
  return h('div', { class: 'plan-row' }, label, input, odds);
}
