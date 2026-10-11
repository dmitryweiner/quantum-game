import {
  playChshRound,
  type Card,
  type ChshRound,
  type ChshStrategy,
  type Move,
  type Outcome,
} from '../../quantum/entangled';
import { mulberry32 } from '../../quantum/rng';
import { T } from '../../strings/ui';
import { h } from './dom';

const CARD: Readonly<Record<Card, string>> = { 0: '☀️', 1: '🌙' };
const ANSWER: Readonly<Record<Outcome, string>> = { 0: '🔴', 1: '🔵' };
const MOVES: readonly Move[] = ['red', 'blue', 'look-z', 'look-x'];

const moveLabel = (m: Move): string => {
  const c = T().chsh;
  return { red: c.moveRed, blue: c.moveBlue, 'look-z': c.moveZ, 'look-x': c.moveX }[m];
};

/** Everything the panel remembers; it survives re-rendering (e.g. a language switch). */
export interface ChshState {
  card: Card;
  last: ChshRound | null;
  played: number;
  won: number;
  strategy: { player: Record<Card, Move>; robot: ChshStrategy['robot'] };
  run: { done: number; won: number; byCards: number[][]; running: boolean } | null;
}

export function newChshState(): ChshState {
  return {
    card: Math.random() < 0.5 ? 0 : 1,
    last: null,
    played: 0,
    won: 0,
    strategy: { player: { 0: 'red', 1: 'red' }, robot: 'quantum' },
    run: null,
  };
}

/**
 * The CHSH game as an HTML panel (PLAN.md §2.2, #10): a few rounds by hand,
 * then a pre-agreed plan played automatically for `rounds` rounds.
 */
export function chshPanel(
  state: ChshState,
  opts: { rounds: number; threshold: number; rerender: () => void; onPass: () => void },
): HTMLElement {
  const c = T().chsh;
  const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);

  // --- 1. By hand
  const playByHand = (move: Move) => {
    const robotCard: Card = rng.next() < 0.5 ? 0 : 1;
    const round = playChshRound({ player: { 0: move, 1: move }, robot: 'quantum' }, rng, [
      state.card,
      robotCard,
    ]);
    state.last = round;
    state.played++;
    if (round.win) state.won++;
    state.card = rng.next() < 0.5 ? 0 : 1;
    opts.rerender();
  };

  const last = state.last;
  const byHand = h(
    'section',
    {},
    h('h2', {}, c.byHand),
    h('p', { class: 'big' }, c.yourCard(CARD[state.card])),
    h(
      'div',
      { class: 'choices' },
      ...MOVES.map((m) =>
        h('button', { class: 'btn', onclick: () => playByHand(m) }, moveLabel(m)),
      ),
    ),
    last &&
      h(
        'p',
        {},
        c.roundResult(
          ANSWER[last.a],
          ANSWER[last.b],
          CARD[last.y],
          last.win,
          last.x & last.y ? c.needDifferent : c.needSame,
        ),
      ),
    state.played > 0 && h('p', { class: 'muted' }, c.tally(state.won, state.played)),
  );

  // --- 2. Plan + automatic run
  const segmented = <V extends string>(
    values: readonly V[],
    current: V,
    label: (v: V) => string,
    set: (v: V) => void,
  ) =>
    h(
      'div',
      { class: 'segmented' },
      ...values.map((v) =>
        h(
          'button',
          {
            class: v === current ? 'btn primary' : 'btn',
            'aria-pressed': String(v === current),
            onclick: () => {
              set(v);
              state.run = null;
              opts.rerender();
            },
          },
          label(v),
        ),
      ),
    );

  const startRun = () => {
    const strategy: ChshStrategy = {
      player: { ...state.strategy.player },
      robot: state.strategy.robot,
    };
    const run = {
      done: 0,
      won: 0,
      byCards: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      running: true,
    };
    state.run = run;
    const total = opts.rounds;
    const perFrame = Math.ceil(total / 90);
    const tick = () => {
      if (state.run !== run) return; // plan changed or panel reset
      for (let i = 0; i < perFrame && run.done < total; i++) {
        const r = playChshRound(strategy, rng);
        run.done++;
        // byCards[x][y*2] = wins, byCards[x][y*2+1] = rounds
        run.byCards[r.x]![r.y * 2 + 1]!++;
        if (r.win) {
          run.won++;
          run.byCards[r.x]![r.y * 2]!++;
        }
      }
      if (run.done >= total) {
        run.running = false;
        opts.rerender();
        if (run.won >= opts.threshold * total) opts.onPass();
        return;
      }
      opts.rerender();
      requestAnimationFrame(tick);
    };
    opts.rerender();
    requestAnimationFrame(tick);
  };

  const run = state.run;
  const passed = run && !run.running && run.won >= opts.threshold * opts.rounds;
  const plan = h(
    'section',
    {},
    h('h2', {}, c.plan),
    ...([0, 1] as Card[]).map((card) =>
      h(
        'div',
        { class: 'plan-row' },
        h('span', { class: 'plan-label' }, c.forCard(CARD[card])),
        segmented(
          MOVES,
          state.strategy.player[card],
          moveLabel,
          (m) => (state.strategy.player[card] = m),
        ),
      ),
    ),
    h(
      'div',
      { class: 'plan-row' },
      h('span', { class: 'plan-label' }, c.robotPlan),
      segmented(
        ['quantum', 'always-red'] as const,
        state.strategy.robot,
        (r) => (r === 'quantum' ? c.robotQuantum : c.robotClassical),
        (r) => (state.strategy.robot = r),
      ),
    ),
    h(
      'p',
      {},
      h(
        'button',
        { class: 'btn primary', onclick: startRun, ...(run?.running ? { disabled: '' } : {}) },
        c.run(opts.rounds),
      ),
      ' ',
      h('span', { class: 'muted' }, c.target(opts.threshold)),
    ),
    run &&
      h(
        'p',
        { class: passed ? 'big good' : 'big' },
        run.running
          ? c.running(run.done, opts.rounds)
          : `${c.result(run.won, opts.rounds)} ${passed ? '✅' : '❌'}`,
      ),
    run && !run.running && breakdown(run.byCards),
    run && !run.running && !passed && h('p', { class: 'muted' }, c.classicalLimit),
  );

  return h('div', {}, h('p', {}, c.rules), byHand, plan);
}

function breakdown(byCards: number[][]): HTMLElement {
  const cell = (x: Card, y: Card) => {
    const wins = byCards[x]![y * 2]!;
    const n = byCards[x]![y * 2 + 1]!;
    return h('td', {}, n ? `${Math.round((100 * wins) / n)}%` : '—');
  };
  return h(
    'table',
    { class: 'breakdown' },
    h('caption', {}, T().chsh.breakdown),
    h('tr', {}, h('th', {}, ''), h('th', {}, '🤖 ☀️'), h('th', {}, '🤖 🌙')),
    h('tr', {}, h('th', {}, '☀️'), cell(0, 0), cell(0, 1)),
    h('tr', {}, h('th', {}, '🌙'), cell(1, 0), cell(1, 1)),
  );
}
