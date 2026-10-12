import { LEVELS } from '../../levels';
import type { Basis } from '../../levels/map';
import type { LevelDef } from '../../levels/types';
import type { LossReason } from '../systems/LevelSim';
import { EFFECTS, type EffectId } from '../../strings/effects';
import { LOCALES, locale, onLocaleChange, setLocale, tr } from '../../i18n';
import { T } from '../../strings/ui';
import { play, setSoundEnabled, soundEnabled } from '../audio';
import { h, type Child } from './dom';
import { chshPanel, type ChshState } from './ChshPanel';
import type { InspectInfo } from './inspect';
import { completedLevels } from './progress';
import './ui.css';

/**
 * DOM overlay above the canvas: HUD bar and full-screen panels. Text-heavy
 * screens are HTML so links work, text wraps and scrolls natively.
 */
export class Ui {
  private readonly root: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly hudTitle: HTMLElement;
  private readonly hudGoal: HTMLElement;
  private readonly hudTimer: HTMLElement;
  private screen: HTMLElement | null = null;
  private hudLevel: LevelDef | null = null;
  private readonly langButton: HTMLButtonElement;
  private readonly glassesButton: HTMLButtonElement;
  private readonly inspectButton: HTMLButtonElement;
  private readonly focusBox: HTMLElement;
  private readonly focusInput: HTMLInputElement;
  private readonly focusLabel: HTMLElement;
  private readonly focusBlurry: HTMLElement;
  private readonly focusSharp: HTMLElement;
  private glassesMode: Basis | null = null;
  private banner: HTMLElement | null = null;
  private onSwitch: (() => void) | null = null;
  /** Name of the open panel, so background updates only redraw their own panel. */
  private screenName = '';
  /** Re-renders the open panel, e.g. after the language changes. */
  private reopen: (() => void) | null = null;
  private onKey: ((e: KeyboardEvent) => void) | null = null;

  /** Set by the level scene. */
  handlers = {
    menu: () => {},
    restart: () => {},
    info: () => {},
    glasses: () => {},
    focus: (_value: number) => {},
    inspect: () => {},
    hudResized: () => {},
  };

  /** Bottom edge of the HUD (and the classical-mode banner under it), CSS pixels. */
  hudBottom(): number {
    const hud = this.hud.hidden ? 0 : this.hud.getBoundingClientRect().bottom;
    const banner = this.banner ? this.banner.getBoundingClientRect().bottom : 0;
    return Math.max(hud, banner);
  }

  constructor() {
    this.root = h('div', { id: 'ui' });
    this.hudTitle = h('b');
    this.hudGoal = h('span');
    this.hudTimer = h('div', { class: 'timer' });
    this.glassesButton = h('button', {
      class: 'icon-btn glasses-btn',
      onclick: () => this.handlers.glasses(),
    });
    this.glassesButton.hidden = true;
    this.inspectButton = h(
      'button',
      { class: 'icon-btn', onclick: () => this.handlers.inspect() },
      '🔍',
    );
    this.focusInput = h('input', {
      type: 'range',
      min: '0',
      max: '1',
      step: '0.01',
      class: 'focus-range',
      oninput: () => this.handlers.focus(Number(this.focusInput.value)),
    });
    this.focusLabel = h('span', { class: 'focus-label' });
    this.focusBlurry = h('span', { class: 'focus-end' });
    this.focusSharp = h('span', { class: 'focus-end' });
    this.focusBox = h(
      'div',
      { class: 'focus-box' },
      this.focusLabel,
      h('div', { class: 'focus-row' }, this.focusBlurry, this.focusInput, this.focusSharp),
    );
    this.focusBox.hidden = true;
    this.langButton = h('button', {
      class: 'icon-btn lang-btn',
      onclick: () => {
        const i = LOCALES.indexOf(locale());
        setLocale(LOCALES[(i + 1) % LOCALES.length]!);
      },
    });
    this.hud = h(
      'div',
      { class: 'hud' },
      h(
        'div',
        { class: 'hud-main' },
        h(
          'button',
          { class: 'icon-btn', 'aria-label': T().menu, onclick: () => this.handlers.menu() },
          '☰',
        ),
        h('div', { class: 'goal' }, this.hudTitle, this.hudGoal),
        this.hudTimer,
      ),
      h(
        'div',
        { class: 'hud-tools' },
        this.glassesButton,
        this.inspectButton,
        this.langButton,
        h(
          'button',
          { class: 'icon-btn', 'aria-label': 'Learn more', onclick: () => this.handlers.info() },
          'ℹ️',
        ),
        h(
          'button',
          { class: 'icon-btn', 'aria-label': T().retry, onclick: () => this.handlers.restart() },
          '↻',
        ),
      ),
    );
    // The map is laid out below the HUD, whose height depends on the screen width.
    new ResizeObserver(() => {
      // Panels start below the HUD, which is taller when its buttons wrap.
      this.root.style.setProperty('--hud-h', `${this.hud.offsetHeight}px`);
      this.handlers.hudResized();
    }).observe(this.hud);
    this.hud.hidden = true;
    this.root.append(this.hud, this.focusBox);
    document.documentElement.lang = locale();
    this.updateLangButton();
    onLocaleChange(() => {
      this.updateLangButton();
      this.setHud(this.hudLevel);
      this.setGlasses(this.glassesMode);
      if (!this.focusBox.hidden) this.setFocus(Number(this.focusInput.value));
      this.setInspectMode(this.inspectButton.classList.contains('active'));
      if (this.banner) this.renderBanner(this.banner.dataset.button === 'true');
      this.reopen?.();
    });
    document.body.append(this.root);
    // A soft click for every button press.
    this.root.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) play('click');
    });
  }

  /** Shows the glasses switch with its mode, or hides it (null). */
  setGlasses(mode: Basis | null): void {
    this.glassesMode = mode;
    this.glassesButton.hidden = mode === null;
    if (mode) {
      this.glassesButton.textContent = T().glasses(mode);
      this.glassesButton.title = T().glassesHint;
      this.glassesButton.setAttribute('aria-label', T().glassesHint);
    }
  }

  private updateLangButton(): void {
    this.langButton.textContent = locale().toUpperCase();
    this.langButton.setAttribute('aria-label', T().language);
    this.langButton.title = T().language;
  }

  get isScreenOpen(): boolean {
    return this.screen !== null;
  }

  setHud(level: LevelDef | null): void {
    this.hudLevel = level;
    this.hud.hidden = level === null;
    if (!level) return;
    this.hudTitle.textContent =
      level.chapter > 0 ? `${T().chapter(level.chapter)} · ${tr(level.title)}` : tr(level.title);
    this.hudGoal.textContent = tr(level.goal);
    this.setTimer(null);
  }

  /** Countdown in seconds, a short status text, or nothing. */
  setTimer(value: number | string | null): void {
    this.hudTimer.textContent =
      value === null ? '' : typeof value === 'number' ? String(Math.ceil(value)) : value;
  }

  /** The "classical mode" notice under the HUD, or none. */
  setClassicalBanner(onSwitch: (() => void) | null): void {
    const had = this.banner !== null;
    this.banner?.remove();
    this.banner = null;
    this.onSwitch = onSwitch;
    if (!onSwitch) {
      if (had) this.handlers.hudResized();
      return;
    }
    this.banner = h('div', { class: 'classical-banner' });
    this.root.append(this.banner);
    this.renderBanner(false);
  }

  /** Shows the "switch quantum on" button on the banner. */
  revealQuantumSwitch(): void {
    if (this.banner) this.renderBanner(true);
  }

  private renderBanner(withButton: boolean): void {
    const b = this.banner;
    if (!b) return;
    b.replaceChildren(h('span', {}, T().classical.banner));
    if (withButton) {
      b.append(
        h(
          'button',
          { class: 'btn primary', onclick: () => this.onSwitch?.() },
          T().classical.switch,
        ),
      );
    }
    b.dataset.button = String(withButton);
    // The map moves down to make room for the banner.
    this.handlers.hudResized();
  }

  /** Shows the focus slider at `value` (0 blurry … 1 sharp), or hides it. */
  setFocus(value: number | null): void {
    this.focusBox.hidden = value === null;
    if (value !== null) this.focusInput.value = String(value);
    this.focusInput.setAttribute('aria-label', T().focusHint);
    this.focusLabel.textContent = T().focusLabel;
    this.focusBlurry.textContent = T().focusBlurry;
    this.focusSharp.textContent = T().focusSharp;
  }

  setInspectMode(on: boolean): void {
    this.inspectButton.classList.toggle('active', on);
    this.inspectButton.setAttribute('aria-pressed', String(on));
    this.inspectButton.title = T().inspect.button;
    this.inspectButton.setAttribute('aria-label', T().inspect.button);
  }

  showInspect(info: InspectInfo, onClose: () => void): void {
    const s = T().inspect;
    this.open(
      [
        h('h1', {}, info.title),
        info.state.length > 0 && h('h2', {}, s.stateTitle),
        ...info.state.map((t) => h('p', {}, t)),
        h('h2', {}, s.whyTitle),
        h('p', {}, info.why),
        h(
          'p',
          {},
          h(
            'button',
            {
              class: 'btn',
              onclick: () =>
                this.showLearnMore(info.effects, () => this.showInspect(info, onClose)),
            },
            T().learnMore,
          ),
        ),
      ],
      [{ label: T().close, primary: true, cancel: true, run: onClose }],
      () => this.showInspect(info, onClose),
    );
  }

  closeScreen(): void {
    this.screen?.remove();
    this.screen = null;
    this.reopen = null;
    this.screenName = '';
    this.hud.classList.remove('covered');
    if (this.onKey) window.removeEventListener('keydown', this.onKey);
    this.onKey = null;
    // A focused button would swallow Space, which closes the eyes.
    (document.activeElement as HTMLElement | null)?.blur();
  }

  /** Shows a panel; Enter presses the primary button, Escape the cancel one. */
  private open(
    content: Child[],
    actions: { label: string; primary?: boolean; cancel?: boolean; run: () => void }[],
    reopen: () => void,
    name = '',
  ): void {
    // Redrawing the same panel keeps its scroll position (e.g. during the CHSH run).
    const keepScroll =
      name && name === this.screenName ? (this.screen?.querySelector('.panel')?.scrollTop ?? 0) : 0;
    this.closeScreen();
    this.reopen = reopen;
    this.screenName = name;
    this.hud.classList.add('covered');
    const buttons = actions.map((a) =>
      h(
        'button',
        {
          class: a.primary ? 'btn primary' : 'btn',
          onclick: () => {
            this.closeScreen();
            a.run();
          },
        },
        a.label,
      ),
    );
    const panel = h('div', { class: 'panel', role: 'dialog' }, ...content);
    if (buttons.length) panel.append(h('div', { class: 'actions' }, ...buttons));
    this.screen = h('div', { class: 'screen' }, panel);
    this.root.append(this.screen);
    panel.scrollTop = keepScroll;
    this.onKey = (e) => {
      const target =
        e.key === 'Enter'
          ? actions.findIndex((a) => a.primary)
          : e.key === 'Escape'
            ? actions.findIndex((a) => a.cancel)
            : -1;
      if (target >= 0) {
        e.preventDefault();
        buttons[target]?.click();
      }
    };
    window.addEventListener('keydown', this.onKey);
  }

  showMenu(onPick: (id: string) => void): void {
    const done = completedLevels();
    const chapters = [...new Set(LEVELS.map((l) => l.chapter))];
    const pick = (id: string) => () => {
      this.closeScreen();
      onPick(id);
    };
    const next = LEVELS.find((l) => !done.has(l.id));
    const sound = soundEnabled();
    const content: Child[] = [
      h('h1', {}, `👁️ ${T().title}`),
      h('p', { class: 'muted' }, T().tagline),
      h(
        'div',
        { class: 'choices' },
        next &&
          h(
            'button',
            { class: 'btn primary', onclick: pick(next.id) },
            done.size > 0 ? T().continueTo(tr(next.title)) : T().play,
          ),
        h(
          'button',
          {
            class: 'btn',
            'aria-pressed': String(sound),
            onclick: () => {
              setSoundEnabled(!sound);
              this.showMenu(onPick);
            },
          },
          sound ? T().soundOn : T().soundOff,
        ),
      ),
    ];
    for (const ch of chapters) {
      const levels = LEVELS.filter((l) => l.chapter === ch);
      const passed = levels.filter((l) => done.has(l.id)).length;
      content.push(
        h(
          'h2',
          {},
          `${T().chapter(ch)} · ${T().chapterTitles[ch] ?? ''} `,
          h('span', { class: 'chapter-count' }, `${passed}/${levels.length}`),
        ),
      );
      const list = h('ul', { class: 'level-list' });
      levels.forEach((l, i) => {
        list.append(
          h(
            'li',
            {},
            h(
              'button',
              { class: 'btn', onclick: pick(l.id) },
              h('span', { class: 'num' }, `${ch}.${i + 1}`),
              tr(l.title),
              done.has(l.id) && h('span', { class: 'done' }, '✓'),
            ),
          ),
        );
      });
      content.push(list);
    }
    content.push(
      h('h2', {}, T().sandbox),
      h(
        'ul',
        { class: 'level-list' },
        h('li', {}, h('button', { class: 'btn', onclick: pick('sandbox') }, '🧪', T().sandboxNote)),
      ),
      h(
        'details',
        { class: 'about' },
        h('summary', {}, T().aboutTitle),
        ...T().about.map((t) => h('p', {}, t)),
      ),
      h('p', { class: 'muted' }, `build ${__BUILD__}`),
    );
    this.open(content, [], () => this.showMenu(onPick));
  }

  showIntro(
    level: LevelDef,
    touch: boolean,
    onStart: () => void,
    onMenu: () => void,
    classical = false,
  ): void {
    if (classical) {
      this.open(
        [
          h('p', { class: 'muted' }, T().chapter(level.chapter)),
          h('h1', {}, `${T().classical.title}: ${tr(level.title)}`),
          h('p', {}, tr(level.goal)),
          h('p', { class: 'hint' }, T().classical.intro),
          h('p', { class: 'muted' }, touch ? T().controlsTouch : T().controlsDesktop),
        ],
        [
          { label: T().start, primary: true, run: onStart },
          { label: T().menu, cancel: true, run: onMenu },
        ],
        () => this.showIntro(level, touch, onStart, onMenu, classical),
      );
      return;
    }
    this.open(
      [
        h('p', { class: 'muted' }, level.chapter > 0 ? T().chapter(level.chapter) : ''),
        h('h1', {}, tr(level.title)),
        h('p', {}, tr(level.goal)),
        level.hint && h('p', { class: 'hint' }, tr(level.hint)),
        h('p', { class: 'muted' }, touch ? T().controlsTouch : T().controlsDesktop),
        level.glasses && h('p', { class: 'hint' }, T().glassesHint),
        level.focus && h('p', { class: 'hint' }, T().focusHint),
        level.chapter > 0 && h('h2', {}, T().whyClassicalFails),
        level.chapter > 0 && h('p', {}, tr(level.whyClassicalFails)),
        this.effectsLink(level, () => this.showIntro(level, touch, onStart, onMenu)),
      ],
      [
        { label: T().start, primary: true, run: onStart },
        { label: T().menu, cancel: true, run: onMenu },
      ],
      () => this.showIntro(level, touch, onStart, onMenu, classical),
    );
  }

  showLearnMore(effects: readonly EffectId[], onClose: () => void): void {
    this.open(
      [h('h1', {}, T().learnMoreTitle), ...effects.map((id) => this.effectCard(id))],
      [{ label: T().close, primary: true, cancel: true, run: onClose }],
      () => this.showLearnMore(effects, onClose),
    );
  }

  showWin(
    level: LevelDef,
    next: LevelDef | undefined,
    on: { next: () => void; replay: () => void; menu: () => void },
  ): void {
    this.open(
      [
        h('h1', {}, T().won[level.winCondition.type]),
        h('h2', {}, T().whatHappened),
        h('p', {}, tr(level.explanation)),
        !next && h('p', { class: 'muted' }, T().allDone),
        this.effectsLink(level, () => this.showWin(level, next, on)),
      ],
      [
        ...(next ? [{ label: T().next, primary: true, run: on.next }] : []),
        { label: T().retry, primary: !next, run: on.replay },
        { label: T().menu, cancel: true, run: on.menu },
      ],
      () => this.showWin(level, next, on),
    );
  }

  showLose(reason: LossReason, onRetry: () => void, onMenu: () => void): void {
    const text = {
      time: [T().lost, T().lostText],
      'wrong-colour': [T().lostWrongColour, T().lostWrongColourText],
      escaped: [T().lostEscaped, T().lostEscapedText],
      core: [T().lostCore, T().lostCoreText],
    }[reason];
    this.open(
      [h('h1', {}, text[0]), h('p', {}, text[1])],
      [
        { label: T().retry, primary: true, run: onRetry },
        { label: T().menu, cancel: true, run: onMenu },
      ],
      () => this.showLose(reason, onRetry, onMenu),
    );
  }

  /** The CHSH game panel; `state` keeps rounds and the plan across redraws. */
  showChsh(level: LevelDef, state: ChshState, on: { pass: () => void; menu: () => void }): void {
    if (level.winCondition.type !== 'chsh') return;
    const { rounds, threshold } = level.winCondition;
    const show = () => this.showChsh(level, state, on);
    this.open(
      [
        h('h1', {}, tr(level.title)),
        chshPanel(state, {
          rounds,
          threshold,
          rerender: () => {
            if (this.screenName === 'chsh') show();
          },
          onPass: on.pass,
        }),
        this.effectsLink(level, show),
      ],
      [{ label: T().menu, cancel: true, run: on.menu }],
      show,
      'chsh',
    );
  }

  private effectsLink(level: LevelDef, back: () => void): HTMLElement {
    return h(
      'p',
      {},
      h(
        'button',
        { class: 'btn', onclick: () => this.showLearnMore(level.effects, back) },
        T().learnMore,
      ),
    );
  }

  private effectCard(id: EffectId): HTMLElement {
    const info = EFFECTS[id];
    return h(
      'div',
      { class: 'effect' },
      h('h3', {}, tr(info.name)),
      h('p', {}, tr(info.summary)),
      h(
        'div',
        {},
        ...info.links[locale()].map((l) =>
          h('a', { href: l.url, target: '_blank', rel: 'noopener' }, `${l.title} ↗`),
        ),
      ),
    );
  }
}
