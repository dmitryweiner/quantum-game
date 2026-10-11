import { mulberry32, type Rng } from '../../quantum/rng';
import { T } from '../../strings/ui';
import { play } from '../audio';
import {
  bellMeasure,
  check,
  compare,
  decide,
  maxCompare,
  newSpyGame,
  newTeleportGame,
  nextChannel,
  nextRound,
  peek,
  receive,
  toggleFlip,
  type SpyGame,
  type TeleportGame,
} from '../systems/qinfo';
import { h } from './dom';

const SECRET_EMOJI = ['🔴', '🔵', '🟢', '🟠'] as const;
const BIT = (b: number) => (b ? '1' : '0');
const freshRng = (): Rng => mulberry32((Math.random() * 2 ** 32) >>> 0);

/** Panel callbacks shared by the chapter 6 panels. */
interface PanelEvents {
  rerender: () => void;
  won: () => void;
  lost: () => void;
}

// --- Teleporter ------------------------------------------------------------

export interface TeleportPanelState {
  game: TeleportGame;
  done: boolean;
}

export const newTeleportPanelState = (rounds: number): TeleportPanelState => ({
  game: newTeleportGame(rounds, freshRng()),
  done: false,
});

export function teleportPanel(state: TeleportPanelState, on: PanelEvents): HTMLElement {
  const t = T().teleport;
  const g = state.game;
  const rng = freshRng();
  const act = (fn: () => void) => () => {
    if (state.done) return;
    fn();
    on.rerender();
  };
  const judged = g.result !== null;
  const btn = (label: string, enabled: boolean, fn: () => void, primary = false) =>
    h(
      'button',
      {
        class: primary ? 'btn primary' : 'btn',
        ...(enabled ? {} : { disabled: '' }),
        onclick: act(fn),
      },
      label,
    );
  const secretColour = SECRET_EMOJI[g.secret]!;

  return h(
    'div',
    {},
    h('p', { class: 'muted' }, t.scheme),
    h('p', { class: 'big' }, t.streak(g.streak, g.rounds)),
    h(
      'div',
      { class: 'tele-row' },
      h(
        'span',
        { class: 'tele-ball' },
        judged || g.peeked !== null ? '💨' : '🎁',
        h('small', {}, t.secret),
      ),
      h('span', { class: 'tele-arrow' }, '⟶ ☎️ ⟶'),
      h(
        'span',
        { class: 'tele-ball' },
        judged ? (g.result ? secretColour : '❌') : '⚪',
        h('small', {}, t.far),
      ),
    ),
    h(
      'div',
      { class: 'choices' },
      btn(t.bell, !g.bits && g.peeked === null && !judged, () => {
        bellMeasure(g, rng);
        play('flash');
      }),
      btn(t.peek, !g.bits && g.peeked === null && !judged, () => {
        peek(g, rng);
        play('flash');
      }),
    ),
    g.bits && h('p', { class: 'big' }, t.bits(BIT(g.bits[0]), BIT(g.bits[1]))),
    g.bits && h('p', { class: 'muted' }, t.rule),
    g.bits &&
      h(
        'div',
        { class: 'choices' },
        btn(t.flipX(g.flips.X), !judged, () => toggleFlip(g, 'X')),
        btn(t.flipZ(g.flips.Z), !judged, () => toggleFlip(g, 'Z')),
      ),
    g.peeked !== null && h('p', {}, t.peeked(SECRET_EMOJI[g.peeked]!)),
    h(
      'div',
      { class: 'choices' },
      btn(
        t.check,
        (g.bits !== null || g.peeked !== null) && !judged,
        () => {
          const ok = check(g, rng);
          play(ok ? 'lamp' : 'lose');
          if (g.streak >= g.rounds) {
            state.done = true;
            on.won();
          }
        },
        true,
      ),
      judged && !state.done && btn(t.next, true, () => nextRound(g, rng)),
    ),
    judged && h('p', { class: 'big' }, g.result ? t.match(secretColour) : t.miss(secretColour)),
  );
}

// --- Spy on the line ---------------------------------------------------------

export interface SpyPanelState {
  game: SpyGame;
  compareK: number;
  done: boolean;
}

export const newSpyPanelState = (channels: number): SpyPanelState => ({
  game: newSpyGame(channels, freshRng()),
  compareK: 6,
  done: false,
});

export function spyPanel(state: SpyPanelState, on: PanelEvents): HTMLElement {
  const s = T().spy;
  const g = state.game;
  const c = g.current;
  const rng = freshRng();
  const act = (fn: () => void) => () => {
    if (state.done) return;
    fn();
    on.rerender();
  };
  const max = maxCompare(g);
  state.compareK = Math.min(state.compareK, max);

  // Slider updates its label in place while dragged (re-creating it would drop the finger).
  const label = h('span', { class: 'plan-label' }, s.compareLabel(state.compareK, max));
  const compareBtn = h(
    'button',
    {
      class: 'btn',
      ...(c.photons && !c.compared ? {} : { disabled: '' }),
      onclick: act(() => {
        compare(g, state.compareK);
        play('tick');
      }),
    },
    s.compare(state.compareK),
  );
  const slider = h('input', {
    type: 'range',
    min: '0',
    max: String(max),
    step: '1',
    value: String(state.compareK),
    class: 'passes-range',
    ...(c.photons && !c.compared ? {} : { disabled: '' }),
    oninput: () => {
      state.compareK = Number(slider.value);
      label.textContent = s.compareLabel(state.compareK, max);
      compareBtn.textContent = s.compare(state.compareK);
    },
  });

  const verdictGiven = c.verdict !== null;
  const verdictBtn = (text: string, verdict: 'clean' | 'spy', primary: boolean) =>
    h(
      'button',
      {
        class: primary ? 'btn primary' : 'btn',
        ...(c.photons && !verdictGiven ? {} : { disabled: '' }),
        onclick: act(() => {
          const right = decide(g, verdict);
          play(right ? 'lamp' : 'lose');
          if (g.lost) {
            state.done = true;
            on.lost();
          } else if (g.correct >= g.channels) {
            state.done = true;
            on.won();
          }
        }),
      },
      text,
    );

  return h(
    'div',
    {},
    h('p', { class: 'muted' }, s.scheme),
    h('p', { class: 'big' }, s.progress(g.correct, g.channels)),
    h(
      'div',
      { class: 'choices' },
      h(
        'button',
        {
          class: 'btn primary',
          ...(c.photons ? { disabled: '' } : {}),
          onclick: act(() => {
            receive(g, rng);
            play('tick');
          }),
        },
        s.receive(g.photonsPerChannel),
      ),
    ),
    c.photons && h('p', {}, s.received(c.photons.length, c.sifted.length)),
    c.photons && h('div', { class: 'plan-row' }, label, slider),
    c.photons && h('div', { class: 'choices' }, compareBtn),
    c.compared && h('p', { class: 'big' }, s.compared(c.compared.checked, c.compared.errors)),
    c.photons &&
      h(
        'div',
        { class: 'choices' },
        verdictBtn(s.clean, 'clean', false),
        verdictBtn(s.spyCall, 'spy', false),
      ),
    verdictGiven && h('p', { class: 'big' }, g.lost ? s.wrong(c.spy) : s.right(c.spy)),
    verdictGiven &&
      !state.done &&
      h(
        'div',
        { class: 'choices' },
        h('button', { class: 'btn primary', onclick: act(() => nextChannel(g, rng)) }, s.next),
      ),
  );
}
