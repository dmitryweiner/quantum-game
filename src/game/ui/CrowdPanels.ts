import { mulberry32, type Rng } from '../../quantum/rng';
import type { ParticleKind } from '../../quantum/statistics';
import { T } from '../../strings/ui';
import { play } from '../audio';
import {
  chooseKind,
  dropRound,
  moveBucket,
  newPairGame,
  newPlinkoGame,
  sendPair,
  type PairGame,
  type PlinkoGame,
} from '../systems/crowds';
import { h } from './dom';

const freshRng = (): Rng => mulberry32((Math.random() * 2 ** 32) >>> 0);

interface PanelEvents {
  rerender: () => void;
  won: () => void;
  lost: () => void;
}

// --- Quantum Plinko ----------------------------------------------------------

export interface PlinkoPanelState {
  game: PlinkoGame;
  done: boolean;
}

export const newPlinkoPanelState = (): PlinkoPanelState => ({ game: newPlinkoGame(), done: false });

export function plinkoPanel(state: PlinkoPanelState, on: PanelEvents): HTMLElement {
  const p = T().plinko;
  const g = state.game;
  const max = Math.max(1, ...g.landed);

  const bars = g.landed.map((n, i) => {
    const inBucket = i === g.bucket || i === g.bucket + 1;
    return h(
      'div',
      { class: inBucket ? 'slot bucket' : 'slot' },
      h('div', { class: 'bar', style: `height:${Math.round((100 * n) / max)}%` }),
    );
  });
  const board = h('div', { class: 'plinko-board', 'aria-label': p.landedTitle }, ...bars);
  const bucketRow = h(
    'div',
    { class: 'plinko-board bucket-row', 'aria-hidden': 'true' },
    ...g.landed.map((_, i) => h('div', { class: 'slot-cell' }, i === g.bucket ? '🪣' : '')),
  );

  // The bucket slider repaints only the bucket marks while dragged.
  const label = h('span', { class: 'plan-label' }, p.bucket(g.bucket));
  const slider = h('input', {
    type: 'range',
    min: '0',
    max: String(g.slots - 2),
    step: '1',
    value: String(g.bucket),
    class: 'passes-range',
    oninput: () => {
      moveBucket(g, Number(slider.value));
      label.textContent = p.bucket(g.bucket);
      bars.forEach((b, i) => b.classList.toggle('bucket', i === g.bucket || i === g.bucket + 1));
      [...bucketRow.children].forEach((c, i) => (c.textContent = i === g.bucket ? '🪣' : ''));
    },
  });

  return h(
    'div',
    {},
    h('p', { class: 'muted' }, p.scheme),
    h('p', { class: 'plan-label' }, p.landedTitle),
    board,
    bucketRow,
    h('div', { class: 'plan-row' }, label, slider),
    h(
      'div',
      { class: 'choices' },
      h(
        'button',
        {
          class: 'btn primary',
          ...(state.done ? { disabled: '' } : {}),
          onclick: () => {
            if (state.done) return;
            const caught = dropRound(g, freshRng());
            play(caught >= g.need ? 'lamp' : 'hit');
            on.rerender();
            if (g.won) {
              state.done = true;
              on.won();
            }
          },
        },
        p.drop(g.balls),
      ),
    ),
    g.lastCaught !== null && h('p', { class: 'big' }, p.caught(g.lastCaught, g.need)),
  );
}

// --- Sheep and penguins ------------------------------------------------------

export interface PairsPanelState {
  game: PairGame;
  done: boolean;
}

export const newPairsPanelState = (): PairsPanelState => ({ game: newPairGame(), done: false });

export function pairsPanel(state: PairsPanelState, on: PanelEvents): HTMLElement {
  const t = T().pairs;
  const g = state.game;
  const kinds: [ParticleKind, string][] = [
    ['bosons', t.bosons],
    ['fermions', t.fermions],
    ['marbles', t.marbles],
  ];
  const finished = g.lost || g.done.length === 2;
  return h(
    'div',
    {},
    h('p', { class: 'muted' }, t.scheme),
    g.done.includes('together') &&
      h('p', { class: 'muted' }, `${t.task('together')} — ${t.taskDone}`),
    h('p', { class: 'big' }, t.task(g.task)),
    h('p', {}, t.streak(g.streak, g.need, g.tries)),
    h('span', { class: 'plan-label' }, t.choose),
    h(
      'div',
      { class: 'segmented' },
      ...kinds.map(([k, label]) =>
        h(
          'button',
          {
            class: g.kind === k ? 'btn primary' : 'btn',
            'aria-pressed': String(g.kind === k),
            ...(finished ? { disabled: '' } : {}),
            onclick: () => {
              chooseKind(g, k);
              on.rerender();
            },
          },
          label,
        ),
      ),
    ),
    h(
      'div',
      { class: 'choices' },
      h(
        'button',
        {
          class: 'btn primary',
          ...(g.kind && !finished ? {} : { disabled: '' }),
          onclick: () => {
            if (state.done) return;
            const before = g.done.length;
            const r = sendPair(g, freshRng());
            play(g.done.length > before ? 'lamp' : r === 'apart' ? 'tick' : 'hit');
            on.rerender();
            if (g.done.length === 2) {
              state.done = true;
              on.won();
            } else if (g.lost) {
              state.done = true;
              on.lost();
            }
          },
        },
        t.send,
      ),
    ),
    g.last && h('p', { class: 'big' }, t.result[g.last] ?? ''),
  );
}
