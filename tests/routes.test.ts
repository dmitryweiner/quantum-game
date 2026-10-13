import { describe, expect, it } from 'vitest';
import { idFromHash } from '../src/game/routes';

describe('links', () => {
  it('opens arcades by short names (and old spellings)', () => {
    expect(idFromHash('#snake')).toBe('arcade:snake');
    expect(idFromHash('#ships')).toBe('arcade:invaders');
    expect(idFromHash('#invaders')).toBe('arcade:invaders');
    expect(idFromHash('arcade:quantris')).toBe('arcade:quantris');
    expect(idFromHash('#Tanks')).toBe('arcade:invaders');
    expect(idFromHash('#quantris')).toBe('arcade:quantris');
  });

  it('opens levels and the sandbox by id; ignores the rest', () => {
    expect(idFromHash('#ch1-02')).toBe('ch1-02');
    expect(idFromHash('#sandbox')).toBe('sandbox');
    expect(idFromHash('#nope')).toBeNull();
    expect(idFromHash('')).toBeNull();
  });
});
