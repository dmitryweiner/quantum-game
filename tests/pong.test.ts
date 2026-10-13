import { describe, expect, it } from 'vitest';
import {
  PONG,
  PongGame,
  aiInput,
  type AiLevel,
  type PongEvent,
  type Side,
} from '../src/arcade/pong';
import { mulberry32 } from '../src/quantum/rng';
import { Superposition } from '../src/quantum/superposition';

const still = { paddle: null, look: null };

/** A game with the ball just served towards `side`, the serve pause skipped. */
function served(seed: number, toward: Side = 'player') {
  const g = new PongGame(mulberry32(seed));
  (g as unknown as { serveTo: Side }).serveTo = toward;
  g.pause = 1e-9;
  g.update(1e-6, still, still);
  return g;
}

describe('quantum pong', () => {
  it('the ball keeps all of itself when it bounces off the side walls', () => {
    const g = new PongGame(mulberry32(1));
    const psi = g.psi;
    psi.setWavePacket({ x: 3, y: 16 }, 2, { x: -1.4, y: 0.2 });
    for (let i = 0; i < 100; i++) psi.evolve(0.02, false);
    expect(psi.norm()).toBeCloseTo(1, 4);
  });

  it('the sharper the ball is pinned down, the faster it spreads (uncertainty)', () => {
    const g = new PongGame(mulberry32(2));
    const spreadAfter = (width: number) => {
      const psi = new Superposition(g.lattice, 0, PONG.hop);
      psi.setGaussian({ x: 9, y: 16 }, width);
      psi.evolve(0.6);
      return psi.stats().spread;
    };
    expect(spreadAfter(0.6)).toBeGreaterThan(spreadAfter(2.5));
  });

  /** Share of balls served from mid-field that the player returns, blind or with a late look. */
  function returns(strategy: 'blind' | 'look' | 'away', runs = 80) {
    let returned = 0;
    for (let s = 0; s < runs; s++) {
      const g = served(s);
      g.psi.setWavePacket({ x: 8.5, y: 11 }, PONG.width, { x: 0.15, y: PONG.k });
      let looked = false;
      for (let i = 0; i < 300; i++) {
        const e = g.expected();
        const look =
          strategy === 'look' && !looked && e.y > 25 ? { x: e.x + 0.5, y: e.y + 0.5 } : null;
        const paddle = strategy === 'away' ? PONG.cols : e.x + 0.5;
        const ev = g.update(0.02, { paddle, look }, still);
        if (ev.some((x) => x.type === 'seen')) looked = true;
        if (ev.some((x) => x.type === 'return' && x.side === 'player')) {
          returned++;
          break;
        }
        if (ev.some((x) => x.type === 'point' || x.type === 'return')) break;
      }
    }
    return returned / runs;
  }

  it('a late look near the paddle catches the ball far more often than playing blind', () => {
    const blind = returns('blind');
    const look = returns('look');
    expect(look).toBeGreaterThan(0.6);
    expect(look).toBeGreaterThan(1.5 * blind);
    expect(returns('away')).toBeLessThan(blind);
  });

  it('the ball sometimes tunnels through the thin wall into the AI goal', () => {
    let through = 0;
    let bounced = 0;
    for (let s = 0; s < 80; s++) {
      const g = served(100 + s, 'ai');
      g.psi.setWavePacket({ x: 8.5, y: 9 }, PONG.width, { x: 0, y: -PONG.k });
      g.paddles.ai = PONG.paddleHalf; // out of the way
      for (let i = 0; i < 250; i++) {
        const ev = g.update(0.02, still, still);
        if (ev.some((e) => e.type === 'paradox' && e.paradox.kind === 'tunnel')) {
          through++;
          break;
        }
        if (ev.some((e) => e.type === 'point' || e.type === 'return')) {
          bounced++;
          break;
        }
      }
    }
    expect(through).toBeGreaterThan(3);
    expect(through).toBeLessThan(bounced);
  });

  it('looking costs energy: it runs out while held, and comes back', () => {
    const g = served(5);
    const look = { paddle: null, look: { x: 9, y: 24 } };
    for (let i = 0; i < 200; i++) g.update(0.02, look, still);
    expect(g.energy.player).toBeLessThan(5);
    for (let i = 0; i < 200; i++) g.update(0.02, still, still);
    expect(g.energy.player).toBeGreaterThan(30);
  });

  it('a looking AI beats a blind one — but not every point (looking has a price)', () => {
    const levels: [AiLevel, AiLevel] = ['always', 'blind'];
    let looker = 0;
    let total = 0;
    for (let s = 0; s < 6; s++) {
      const rng = mulberry32(500 + s);
      const g = new PongGame(mulberry32(600 + s));
      for (let i = 0; i < 6000 && !g.over; i++) {
        const ev: PongEvent[] = g.update(
          1 / 30,
          aiInput(g, 'player', levels[1], rng),
          aiInput(g, 'ai', levels[0], rng),
        );
        for (const e of ev)
          if (e.type === 'point') {
            total++;
            if (e.winner === 'ai') looker++;
          }
      }
    }
    expect(total).toBeGreaterThan(20);
    expect(looker / total).toBeGreaterThan(0.5);
    expect(looker / total).toBeLessThan(0.95);
  });

  it('classical mode: a straight ball at the paddle always comes back', () => {
    const g = served(7);
    g.setClassical(true);
    let returned = false;
    for (let i = 0; i < 300 && !returned; i++)
      returned = g
        .update(0.02, { paddle: g.expected().x + 0.5, look: null }, still)
        .some((e) => e.type === 'return' && e.side === 'player');
    expect(returned).toBe(true);
  });
});
