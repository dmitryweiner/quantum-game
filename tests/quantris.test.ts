import { describe, expect, it } from 'vitest';
import { QUANTRIS, QuantrisGame, pieceCells } from '../src/arcade/quantris';
import { mulberry32 } from '../src/quantum/rng';

/** A game whose current piece is an O in superposition of columns a and b. */
function superposedO(seed: number, a: number, b: number, p = 0.5) {
  const g = new QuantrisGame(mulberry32(seed));
  g.piece = {
    kind: 1,
    y: 0,
    branches: [
      { x: a, rot: 0, p },
      { x: b, rot: 0, p: 1 - p },
    ],
    linked: false,
  };
  g.next.linked = false;
  return g;
}

describe('Quantris', () => {
  it('rotates pieces around their box', () => {
    expect(pieceCells(0, 1, 0, 0).map(([x]) => x)).toEqual([2, 2, 2, 2]);
    expect(pieceCells(1, 3, 0, 0).sort()).toEqual(pieceCells(1, 0, 0, 0).sort());
  });

  it('a superposed piece lands in one of its places by the Born rule', () => {
    let left = 0;
    const n = 2000;
    for (let s = 0; s < n; s++) {
      const g = superposedO(s, 1, 6, 0.7);
      g.hardDrop();
      const bottom = g.board[QUANTRIS.rows - 1]!;
      if (bottom[1]! >= 0) left++;
      expect(bottom[1]! >= 0 !== bottom[6]! >= 0).toBe(true);
    }
    expect(left / n).toBeCloseTo(0.7, 1);
  });

  it('touching the stack is a measurement: the other branch may fall on', () => {
    let fellFurther = 0;
    for (let s = 0; s < 400; s++) {
      const g = superposedO(s, 0, 6);
      // A pillar under the left branch only.
      for (let r = 10; r < QUANTRIS.rows; r++) g.board[r]![0] = 3;
      g.hardDrop();
      if (g.board[QUANTRIS.rows - 1]![6]! >= 0) fellFurther++;
    }
    expect(fellFurther / 400).toBeCloseTo(0.5, 1);
  });

  it('branches pushed against a wall merge into one definite piece', () => {
    const g = superposedO(1, 0, 3);
    const events = [...g.move(-1), ...g.move(-1), ...g.move(-1)];
    expect(events.some((e) => e.type === 'merged')).toBe(true);
    expect(g.piece.branches).toEqual([{ x: 0, rot: 0, p: 1 }]);
  });

  it('looks are limited and refill with cleared lines', () => {
    const g = superposedO(2, 0, 5);
    for (let i = 0; i < QUANTRIS.looks; i++) {
      g.piece.branches = [
        { x: 0, rot: 0, p: 0.5 },
        { x: 5, rot: 0, p: 0.5 },
      ];
      g.look();
    }
    g.piece.branches = [
      { x: 0, rot: 0, p: 0.5 },
      { x: 5, rot: 0, p: 0.5 },
    ];
    expect(g.look()).toEqual([]);
    expect(g.looks).toBe(0);
    // Fill the bottom row but two cells, drop an O definite into the gap.
    for (let c = 2; c < QUANTRIS.cols; c++) g.board[QUANTRIS.rows - 1]![c] = 2;
    for (let c = 2; c < QUANTRIS.cols; c++) g.board[QUANTRIS.rows - 2]![c] = 2;
    g.piece = { kind: 1, y: 0, branches: [{ x: 0, rot: 0, p: 1 }], linked: false };
    g.hardDrop();
    expect(g.lines).toBe(2);
    expect(g.looks).toBe(2);
  });

  it('ends when a new piece cannot appear', () => {
    const g = new QuantrisGame(mulberry32(3));
    for (let r = 0; r < QUANTRIS.rows; r++)
      for (let c = 1; c < QUANTRIS.cols; c++) g.board[r]![c] = 0;
    for (let i = 0; i < 50 && !g.over; i++) g.hardDrop();
    expect(g.over).toBe(true);
  });

  it('a landed piece can still be moved until the lock delay runs out', () => {
    const g = new QuantrisGame(mulberry32(4));
    g.piece = { kind: 1, y: QUANTRIS.rows - 2, branches: [{ x: 4, rot: 0, p: 1 }], linked: false };
    g.update(g.fallTime);
    expect(g.grounded).toBe(true);
    g.update(QUANTRIS.lockDelay * 0.8);
    g.move(1);
    // The move restarted the delay: not locked yet.
    g.update(QUANTRIS.lockDelay * 0.8);
    expect(g.board[QUANTRIS.rows - 1]![5]).toBe(-1);
    g.update(QUANTRIS.lockDelay * 0.3);
    expect(g.board[QUANTRIS.rows - 1]![5]).toBe(1);
  });

  it('restarts the lock delay only a few times', () => {
    const g = new QuantrisGame(mulberry32(5));
    g.piece = { kind: 1, y: QUANTRIS.rows - 2, branches: [{ x: 4, rot: 0, p: 1 }], linked: false };
    g.update(g.fallTime);
    for (let i = 0; i <= QUANTRIS.lockResets; i++) {
      g.update(QUANTRIS.lockDelay * 0.6);
      g.move(i % 2 ? 1 : -1);
    }
    g.update(QUANTRIS.lockDelay * 0.6);
    expect(g.board[QUANTRIS.rows - 1]!.some((c) => c === 1)).toBe(true);
  });

  it('a piece moved off a ledge falls again', () => {
    const g = new QuantrisGame(mulberry32(6));
    for (let c = 0; c < 4; c++) g.board[QUANTRIS.rows - 1]![c] = 2;
    g.piece = { kind: 1, y: QUANTRIS.rows - 3, branches: [{ x: 2, rot: 0, p: 1 }], linked: false };
    g.update(g.fallTime);
    expect(g.grounded).toBe(true);
    g.move(1);
    g.move(1);
    expect(g.grounded).toBe(false);
    g.hardDrop();
    expect(g.board[QUANTRIS.rows - 1]![4]).toBe(1);
  });

  it('kicks a piece off the wall when it turns', () => {
    const g = new QuantrisGame(mulberry32(7));
    // A vertical I against the right wall: turning it flat must push it left.
    g.piece = { kind: 0, y: 2, branches: [{ x: QUANTRIS.cols - 3, rot: 1, p: 1 }], linked: false };
    expect(pieceCells(0, 1, QUANTRIS.cols - 3, 2).every(([x]) => x === QUANTRIS.cols - 1)).toBe(
      true,
    );
    g.rotate(1);
    expect(g.piece.branches[0]!.rot).toBe(2);
    const cells = pieceCells(0, 2, g.piece.branches[0]!.x, 2);
    expect(cells.every(([x]) => x >= 0 && x < QUANTRIS.cols)).toBe(true);
  });

  it('turns both ways', () => {
    const g = new QuantrisGame(mulberry32(8));
    g.piece = { kind: 2, y: 3, branches: [{ x: 4, rot: 0, p: 1 }], linked: false };
    g.rotate(-1);
    expect(((g.piece.branches[0]!.rot % 4) + 4) % 4).toBe(3);
    g.rotate(1);
    g.rotate(1);
    expect(((g.piece.branches[0]!.rot % 4) + 4) % 4).toBe(1);
  });

  it('classical mode: every piece is definite', () => {
    const g = new QuantrisGame(mulberry32(10));
    g.setClassical(true);
    for (let i = 0; i < 30 && !g.over; i++) {
      expect(g.piece.branches).toHaveLength(1);
      g.hardDrop();
    }
  });

  it('an entangled next piece settles opposite the moment the current one does', () => {
    for (let s = 0; s < 40; s++) {
      const g = superposedO(300 + s, 0, 6, 0.7);
      g.next = {
        kind: 2,
        y: 0,
        branches: [
          { x: 1, rot: 0, p: 0.3 },
          { x: 5, rot: 0, p: 0.7 },
        ],
        linked: true,
      };
      const events = g.look();
      const kept = events.find((e) => e.type === 'collapsed');
      const spooky = events.find((e) => e.type === 'spooky');
      expect(kept && spooky).toBeTruthy();
      if (kept?.type === 'collapsed' && spooky?.type === 'spooky')
        expect(spooky.kept).toBe(1 - kept.kept);
      expect(g.next.branches).toHaveLength(1);
    }
  });

  it('a piece in two orientations lands in one of them, by the Born rule', () => {
    let first = 0;
    const n = 600;
    for (let s = 0; s < n; s++) {
      const g = new QuantrisGame(mulberry32(s));
      g.next.linked = false;
      // An I: flat (rot 0) or upright (rot 1).
      g.piece = {
        kind: 0,
        y: 0,
        branches: [
          { x: 3, rot: 0, p: 0.7 },
          { x: 3, rot: 1, p: 0.3 },
        ],
        linked: false,
      };
      g.hardDrop();
      const bottom = g.board[QUANTRIS.rows - 1]!;
      if (bottom.filter((c) => c >= 0).length === 4) first++;
    }
    expect(first / n).toBeCloseTo(0.7, 1);
  });

  it('a piece on a thin overhang sometimes tunnels into the hole beneath', () => {
    let tunnelled = 0;
    const n = 500;
    for (let s = 0; s < n; s++) {
      const g = new QuantrisGame(mulberry32(1000 + s));
      const R = QUANTRIS.rows;
      // A one-cell roof over a hole in columns 3–6 (gaps at column 9 keep rows from clearing).
      for (let c = 0; c < 9; c++) g.board[R - 3]![c] = 2;
      for (const r of [R - 2, R - 1]) for (const c of [0, 1, 2, 7, 8]) g.board[r]![c] = 2;
      g.piece = { kind: 1, y: 0, branches: [{ x: 4, rot: 0, p: 1 }], linked: false };
      const events = g.hardDrop();
      if (events.some((e) => e.type === 'tunnelled')) {
        tunnelled++;
        expect(g.board[R - 1]![4]).toBe(1);
      }
    }
    expect(tunnelled / n).toBeCloseTo(QUANTRIS.tunnelChance, 1);
  });

  it('holding the look keeps the piece still (Zeno) and costs a look a second', () => {
    const g = superposedO(7, 0, 6);
    g.looks = 4;
    const events = g.hold(true);
    expect(events.some((e) => e.type === 'collapsed')).toBe(true);
    expect(g.looks).toBe(3);
    const y = g.piece.y;
    for (let i = 0; i < 25; i++) g.update(0.1);
    expect(g.piece.y).toBe(y);
    expect(g.looks).toBe(1);
    for (let i = 0; i < 20; i++) g.update(0.1);
    expect(g.holding).toBe(false);
    for (let i = 0; i < 20; i++) g.update(0.1);
    expect(g.piece.y).toBeGreaterThan(y);
  });

  it('a run of likely outcomes is named: the Born rule is no magic', () => {
    const g = superposedO(9, 0, 6);
    g.looks = 99;
    let streak = false;
    for (let i = 0; i < 40 && !streak; i++) {
      g.piece.branches = [
        { x: 0, rot: 0, p: 0.9 },
        { x: 6, rot: 0, p: 0.1 },
      ];
      streak = g.look().some((e) => e.type === 'streak');
    }
    expect(streak).toBe(true);
  });
});
