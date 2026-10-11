import { LEVELS } from '../../levels';
import type { LevelDef } from '../../levels/types';
import { EFFECTS, type EffectId } from '../../strings/effects';
import { UI } from '../../strings/ui';
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
        { class: 'icon-btn', 'aria-label': UI.menu, onclick: () => this.handlers.menu() },
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
        { class: 'icon-btn', 'aria-label': UI.retry, onclick: () => this.handlers.restart() },
        '↻',
      ),
    );
    this.hud.hidden = true;
    this.root.append(this.hud);
    document.body.append(this.root);
  }

  get isScreenOpen(): boolean {
    return this.screen !== null;
  }

  setHud(level: LevelDef | null): void {
    this.hud.hidden = level === null;
    if (!level) return;
    this.hudTitle.textContent =
      level.chapter > 0 ? `${UI.chapter(level.chapter)} · ${level.title}` : level.title;
    this.hudGoal.textContent = level.goal;
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
      h('h1', {}, `👁️ ${UI.title}`),
      h('p', { class: 'muted' }, UI.tagline),
    ];
    for (const ch of chapters) {
      content.push(h('h2', {}, `${UI.chapter(ch)} · ${UI.chapterTitles[ch] ?? ''}`));
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
              l.title,
              done.has(l.id) && h('span', { class: 'done' }, '✓'),
            ),
          ),
        );
      });
      content.push(list);
    }
    content.push(
      h('h2', {}, UI.sandbox),
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
            UI.sandboxNote,
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
        h('p', { class: 'muted' }, level.chapter > 0 ? UI.chapter(level.chapter) : ''),
        h('h1', {}, level.title),
        h('p', {}, level.goal),
        level.hint && h('p', { class: 'hint' }, level.hint),
        h('p', { class: 'muted' }, touch ? UI.controlsTouch : UI.controlsDesktop),
        level.chapter > 0 && h('h2', {}, UI.whyClassicalFails),
        level.chapter > 0 && h('p', {}, level.whyClassicalFails),
        this.effectsLink(level, () => this.showIntro(level, touch, onStart, onMenu)),
      ],
      [
        { label: UI.start, primary: true, run: onStart },
        { label: UI.menu, cancel: true, run: onMenu },
      ],
    );
  }

  showLearnMore(effects: readonly EffectId[], onClose: () => void): void {
    this.open(
      [h('h1', {}, UI.learnMoreTitle), ...effects.map((id) => this.effectCard(id))],
      [{ label: UI.close, primary: true, cancel: true, run: onClose }],
    );
  }

  showWin(
    level: LevelDef,
    next: LevelDef | undefined,
    on: { next: () => void; replay: () => void; menu: () => void },
  ): void {
    this.open(
      [
        h('h1', {}, UI.won),
        h('h2', {}, UI.whatHappened),
        h('p', {}, level.explanation),
        !next && h('p', { class: 'muted' }, UI.allDone),
        this.effectsLink(level, () => this.showWin(level, next, on)),
      ],
      [
        ...(next ? [{ label: UI.next, primary: true, run: on.next }] : []),
        { label: UI.retry, primary: !next, run: on.replay },
        { label: UI.menu, cancel: true, run: on.menu },
      ],
    );
  }

  showLose(onRetry: () => void, onMenu: () => void): void {
    this.open(
      [h('h1', {}, UI.lost), h('p', {}, UI.lostText)],
      [
        { label: UI.retry, primary: true, run: onRetry },
        { label: UI.menu, cancel: true, run: onMenu },
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
        UI.learnMore,
      ),
    );
  }

  private effectCard(id: EffectId): HTMLElement {
    const info = EFFECTS[id];
    return h(
      'div',
      { class: 'effect' },
      h('h3', {}, info.name),
      h('p', {}, info.summary),
      h(
        'div',
        {},
        ...info.links.map((l) =>
          h('a', { href: l.url, target: '_blank', rel: 'noopener' }, `${l.title} ↗`),
        ),
      ),
    );
  }
}
