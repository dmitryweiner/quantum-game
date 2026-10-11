import { describe, expect, it } from 'vitest';
import { LOCALES, tr } from '../src/i18n';
import { STRING_TABLES } from '../src/strings/ui';

describe('UI string tables', () => {
  it('have the same keys and no empty strings in every language', () => {
    const keys = Object.keys(STRING_TABLES.en).sort();
    for (const l of LOCALES) {
      const table = STRING_TABLES[l];
      expect(Object.keys(table).sort(), l).toEqual(keys);
      for (const [k, v] of Object.entries(table)) {
        if (typeof v === 'string') expect(v.trim(), `${l}.${k}`).not.toBe('');
        if (typeof v === 'function') expect(String(v(1)).trim(), `${l}.${k}`).not.toBe('');
      }
    }
  });

  it('defaults to English outside the browser', () => {
    expect(tr({ en: 'Hello', ru: 'Привет' })).toBe('Hello');
  });
});
