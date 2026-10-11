import { describe, expect, it } from 'vitest';
import { isWall, parseMap } from '../src/levels/map';
import { SANDBOX_MAP } from '../src/levels/sandbox';

describe('parseMap', () => {
  it('parses tiles, player start and objects', () => {
    const map = parseMap(['#####', '#@.c#', '#####']);
    expect(map.cols).toBe(5);
    expect(map.rows).toBe(3);
    expect(map.playerStart).toEqual({ col: 1, row: 1 });
    expect(map.objects).toEqual([{ emoji: '🐱', col: 3, row: 1 }]);
    expect(isWall(map, 0, 0)).toBe(true);
    expect(isWall(map, 2, 1)).toBe(false);
    expect(isWall(map, 3, 1)).toBe(false);
  });

  it('treats out-of-bounds as wall', () => {
    const map = parseMap(['@']);
    expect(isWall(map, -1, 0)).toBe(true);
    expect(isWall(map, 0, 1)).toBe(true);
  });

  it('rejects ragged rows, unknown chars and missing/duplicate player', () => {
    expect(() => parseMap(['@.', '.'])).toThrow(/length/);
    expect(() => parseMap(['@?'])).toThrow(/unknown/);
    expect(() => parseMap(['..'])).toThrow(/no player/);
    expect(() => parseMap(['@@'])).toThrow(/more than one/);
  });

  it('accepts the sandbox map', () => {
    expect(() => parseMap(SANDBOX_MAP)).not.toThrow();
  });
});
