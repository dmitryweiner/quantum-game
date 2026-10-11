import { describe, expect, it } from 'vitest';
import { LOCALES, tr } from '../src/i18n';
import { STRING_TABLES } from '../src/strings/ui';

describe('UI string tables', () => {
  /** Flattens nested tables into 'a.b' → value. */
  const flat = (obj: object, prefix = ''): [string, unknown][] =>
    Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object' ? flat(v as object, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
    );

  it('have the same keys and no empty strings in every language', () => {
    const keys = flat(STRING_TABLES.en)
      .map(([k]) => k)
      .sort();
    for (const l of LOCALES) {
      const entries = flat(STRING_TABLES[l]);
      expect(entries.map(([k]) => k).sort(), l).toEqual(keys);
      for (const [k, v] of entries) {
        if (typeof v === 'string') expect(v.trim(), `${l}.${k}`).not.toBe('');
        if (typeof v === 'function') {
          const out = (v as (...a: unknown[]) => unknown)(1, 'x', 'y', true, 'z');
          expect(String(out).trim(), `${l}.${k}`).not.toBe('');
        }
      }
    }
  });

  it('defaults to English outside the browser', () => {
    expect(tr({ en: 'Hello', ru: 'Привет' })).toBe('Hello');
  });
});
