import { LEVELS } from '../../levels';
import type { LevelDef } from '../../levels/types';
import { EFFECTS, type EffectId } from '../../strings/effects';
import { LOCALE_NAMES, LOCALES, locale, onLocaleChange, setLocale, tr } from '../../i18n';
import { T } from '../../strings/ui';
import { h, type Child } from './dom';
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
  private onKey: ((e: KeyboardEvent) => void) | null = null;

  /** Set by the level scene. */
  handlers = {
    menu: () => {},
    restart: () => {},
    info: () => {},
  };

  constructor() {
    this.root = h('div', { id: 'ui' });
    this.hudTitle = h('b');
    this.hudGoal = h('span');
    this.hudTimer = h('div', { class: 'timer' });
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
    onLocaleChange(() => this.setHud(this.hudLevel));
    document.body.append(this.root);
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
    if (this.onKey) window.removeEventListener('keydown', this.onKey);
    this.onKey = null;
    // A focused button would swallow Space, which closes the eyes.
    (document.activeElement as HTMLElement | null)?.blur();
  }

  /** Shows a panel; Enter presses the primary button, Escape the cancel one. */
  private open(
    content: Child[],
    actions: { label: string; primary?: boolean; cancel?: boolean; run: () => void }[],
  ): void {
    this.closeScreen();
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
      h(
        'div',
        { class: 'lang', role: 'group', 'aria-label': T().language },
        ...LOCALES.map((l) =>
          h(
            'button',
            {
              class: l === locale() ? 'btn primary' : 'btn',
              lang: l,
              onclick: () => {
                setLocale(l);
                this.showMenu(onPick);
              },
            },
            LOCALE_NAMES[l],
          ),
        ),
      ),
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
    this.open(content, []);
  }

  showIntro(level: LevelDef, touch: boolean, onStart: () => void, onMenu: () => void): void {
    this.open(
      [
        h('p', { class: 'muted' }, level.chapter > 0 ? T().chapter(level.chapter) : ''),
        h('h1', {}, tr(level.title)),
        h('p', {}, tr(level.goal)),
        level.hint && h('p', { class: 'hint' }, tr(level.hint)),
        h('p', { class: 'muted' }, touch ? T().controlsTouch : T().controlsDesktop),
        level.chapter > 0 && h('h2', {}, T().whyClassicalFails),
        level.chapter > 0 && h('p', {}, tr(level.whyClassicalFails)),
        this.effectsLink(level, () => this.showIntro(level, touch, onStart, onMenu)),
      ],
      [
        { label: T().start, primary: true, run: onStart },
        { label: T().menu, cancel: true, run: onMenu },
      ],
    );
  }

  showLearnMore(effects: readonly EffectId[], onClose: () => void): void {
    this.open(
      [h('h1', {}, T().learnMoreTitle), ...effects.map((id) => this.effectCard(id))],
      [{ label: T().close, primary: true, cancel: true, run: onClose }],
    );
  }

  showWin(
    level: LevelDef,
    next: LevelDef | undefined,
    on: { next: () => void; replay: () => void; menu: () => void },
  ): void {
    this.open(
      [
        h('h1', {}, T().won),
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
    );
  }

  showLose(onRetry: () => void, onMenu: () => void): void {
    this.open(
      [h('h1', {}, T().lost), h('p', {}, T().lostText)],
      [
        { label: T().retry, primary: true, run: onRetry },
        { label: T().menu, cancel: true, run: onMenu },
      ],
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
