import { LEVELS } from '../../levels';
import type { Basis } from '../../levels/map';
import type { LevelDef } from '../../levels/types';
import { EFFECTS, type EffectId } from '../../strings/effects';
import { LOCALES, locale, onLocaleChange, setLocale, tr } from '../../i18n';
import { T } from '../../strings/ui';
import { h, type Child } from './dom';
import { chshPanel, type ChshState } from './ChshPanel';
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
  private glassesMode: Basis | null = null;
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
  };

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
        'button',
        { class: 'icon-btn', 'aria-label': T().menu, onclick: () => this.handlers.menu() },
        '☰',
      ),
      h('div', { class: 'goal' }, this.hudTitle, this.hudGoal),
      this.hudTimer,
      this.glassesButton,
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
    );
    this.hud.hidden = true;
    this.root.append(this.hud);
    document.documentElement.lang = locale();
    this.updateLangButton();
    onLocaleChange(() => {
      this.updateLangButton();
      this.setHud(this.hudLevel);
      this.setGlasses(this.glassesMode);
      this.reopen?.();
    });
    document.body.append(this.root);
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

  setTimer(secondsLeft: number | null): void {
    this.hudTimer.textContent = secondsLeft === null ? '' : String(Math.ceil(secondsLeft));
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
    const content: Child[] = [
      h('h1', {}, `👁️ ${T().title}`),
      h('p', { class: 'muted' }, T().tagline),
    ];
    for (const ch of chapters) {
      content.push(h('h2', {}, `${T().chapter(ch)} · ${T().chapterTitles[ch] ?? ''}`));
      const list = h('ul', { class: 'level-list' });
      LEVELS.filter((l) => l.chapter === ch).forEach((l, i) => {
        list.append(
          h(
            'li',
            {},
            h(
              'button',
              { class: 'btn', onclick: () => (this.closeScreen(), onPick(l.id)) },
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
        h(
          'li',
          {},
          h(
            'button',
            { class: 'btn', onclick: () => (this.closeScreen(), onPick('sandbox')) },
            '🧪',
            T().sandboxNote,
          ),
        ),
      ),
      h('p', { class: 'muted' }, `build ${__BUILD__}`),
    );
    this.open(content, [], () => this.showMenu(onPick));
  }

  showIntro(level: LevelDef, touch: boolean, onStart: () => void, onMenu: () => void): void {
    this.open(
      [
        h('p', { class: 'muted' }, level.chapter > 0 ? T().chapter(level.chapter) : ''),
        h('h1', {}, tr(level.title)),
        h('p', {}, tr(level.goal)),
        level.hint && h('p', { class: 'hint' }, tr(level.hint)),
        h('p', { class: 'muted' }, touch ? T().controlsTouch : T().controlsDesktop),
        level.glasses && h('p', { class: 'hint' }, T().glassesHint),
        level.chapter > 0 && h('h2', {}, T().whyClassicalFails),
        level.chapter > 0 && h('p', {}, tr(level.whyClassicalFails)),
        this.effectsLink(level, () => this.showIntro(level, touch, onStart, onMenu)),
      ],
      [
        { label: T().start, primary: true, run: onStart },
        { label: T().menu, cancel: true, run: onMenu },
      ],
      () => this.showIntro(level, touch, onStart, onMenu),
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

  showLose(reason: 'time' | 'wrong-colour', onRetry: () => void, onMenu: () => void): void {
    const wrong = reason === 'wrong-colour';
    this.open(
      [
        h('h1', {}, wrong ? T().lostWrongColour : T().lost),
        h('p', {}, wrong ? T().lostWrongColourText : T().lostText),
      ],
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
