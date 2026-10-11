import { describe, expect, it } from 'vitest';
import { blocksSight, isSolid, parseMap, transposeMap } from '../src/levels/map';
import { SANDBOX } from '../src/levels/sandbox';

describe('parseMap', () => {
  it('parses tiles, player start and objects', () => {
    const map = parseMap(['#####', '#@.c#', '#####']);
    expect(map.cols).toBe(5);
    expect(map.rows).toBe(3);
    expect(map.playerStart).toEqual({ col: 1, row: 1 });
    expect(map.objects).toEqual([{ char: 'c', role: 'quantum', emoji: '🐱', col: 3, row: 1 }]);
    expect(isSolid(map, 0, 0)).toBe(true);
    expect(isSolid(map, 2, 1)).toBe(false);
    expect(isSolid(map, 3, 1)).toBe(false);
  });

  it('glass blocks movement but not sight', () => {
    const map = parseMap(['@=#']);
    expect(isSolid(map, 1, 0)).toBe(true);
    expect(blocksSight(map, 1, 0)).toBe(false);
    expect(blocksSight(map, 2, 0)).toBe(true);
  });

  it('treats out-of-bounds as wall', () => {
    const map = parseMap(['@']);
    expect(isSolid(map, -1, 0)).toBe(true);
    expect(isSolid(map, 0, 1)).toBe(true);
  });

  it('rejects ragged rows, unknown chars and missing/duplicate player', () => {
    expect(() => parseMap(['@.', '.'])).toThrow(/length/);
    expect(() => parseMap(['@?'])).toThrow(/unknown/);
    expect(() => parseMap(['..'])).toThrow(/no player/);
    expect(() => parseMap(['@@'])).toThrow(/more than one/);
  });

  it('accepts the sandbox map', () => {
    expect(() => parseMap(SANDBOX.map)).not.toThrow();
  });

  it('transposes maps', () => {
    expect(transposeMap(['#@c', '#.D'])).toEqual(['##', '@.', 'cD']);
    expect(transposeMap(transposeMap(SANDBOX.map))).toEqual(SANDBOX.map);
  });
});
