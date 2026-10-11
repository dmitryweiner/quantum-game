/**
 * Two languages: English and Russian. Every player-facing text is either a
 * `Text` ({ en, ru }) or comes from a per-locale string table, so a missing
 * translation is a type error.
 */
export const LOCALES = ['en', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export type Text = Readonly<Record<Locale, string>>;

const KEY = 'quantum-game:locale';
const listeners = new Set<() => void>();

function detect(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'ru') return saved;
  } catch {
    // Storage blocked: fall back to the browser language.
  }
  const langs =
    typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  return langs.some((l) => /^(ru|be|uk|kk)\b/i.test(l)) ? 'ru' : 'en';
}

let current: Locale = typeof window === 'undefined' ? 'en' : detect();

export function locale(): Locale {
  return current;
}

export function setLocale(next: Locale): void {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Not remembered, but still switched for this session.
  }
  document.documentElement.lang = next;
  for (const fn of listeners) fn();
}

export function onLocaleChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Picks the current language from a `Text`. */
export function tr(text: Text): string {
  return text[current];
}

/** Language names as shown in the switcher (each in its own language). */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { en: 'English', ru: 'Русский' };
