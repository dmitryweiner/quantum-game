# Quantum Game

A web puzzle game about the weirdness of the quantum world. You are an
observer 👁️ — and the very act of looking changes what happens.

**Play:** https://dmitryweiner.github.io/quantum-game/

Game design, architecture and milestones: [PLAN.md](PLAN.md).

Chapter 1 (“The Observer Effect”) is playable: a cat 🐱 that spreads into a
cloud of ghosts whenever you close your eyes, and collapses wherever you look.

## Controls

| Action     | Phone                          | Desktop                    |
| ---------- | ------------------------------ | -------------------------- |
| Move       | Left thumb (floating joystick) | WASD / arrows              |
| Look       | Touch / drag on the right half | Mouse                      |
| Close eyes | Lift the right thumb           | Space or hold right button |

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev        # dev server, also reachable from a phone on the same Wi-Fi
npm test           # Vitest unit tests (quantum core is engine-free)
npm run lint       # ESLint + Prettier check
npm run typecheck
npm run build      # static build into dist/ (base: /quantum-game/)
```

Stack: TypeScript (strict), Phaser 4, Vite, Vitest, ESLint, Prettier.

- `src/quantum/` — pure TypeScript model with a seedable RNG, fully unit-tested.
- `src/game/` — Phaser layer: scenes, entities, input, systems.
- `src/levels/` — level maps and definitions; `tests/levels.test.ts` playtests them by simulation.
- `src/strings/` — all player-facing text (English).

Every push to `main` is deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## License

Code: GPL-3.0. Assets (sounds, fonts, graphics): CC0 only.
