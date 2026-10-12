# Quantum Game

A web puzzle game about the weirdness of the quantum world. You are an
observer 👁️ — and the very act of looking changes what happens.

**Play:** https://dmitryweiner.github.io/quantum-game/

Game design, architecture and milestones: [PLAN.md](PLAN.md).

Free play first: the sandbox, where 🔍 explains every object, and three quantum
arcades built on it — Quantum Snake, Quantum Tanks and Quantris. Then five
chapters of puzzles: the observer effect, entanglement and the CHSH game, the
uncertainty principle, tunnelling and other observers, and interference. Works
offline once added to the home screen.

## Controls

| Action      | Phone                                    | Desktop                                      |
| ----------- | ---------------------------------------- | -------------------------------------------- |
| Walk        | Left stick (left half of the screen)     | WASD / arrows                                |
| Look        | Right stick — push towards where to look | Mouse, or hold Shift and turn with ← →       |
| Close eyes  | Let go of the right stick                | Space or hold the right button; let go Shift |
| Focus       | Slider at the bottom (chapter 3+)        | Slider or mouse wheel                        |
| Glasses Z/X | 👓 button                                | 👓 button or Q                               |
| Inspect     | 🔍 then tap an object                    | Click an object (or 🔍 / I)                  |

## Development

Requires Node 24 (see `.nvmrc`). See [AGENTS.md](AGENTS.md) for the working notes, including `/preview.html` to check phone sizes.

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
- `src/i18n/`, `src/strings/` — all player-facing text, in English and Russian.

Every push to `main` is deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## License

Code: GPL-3.0. Assets (sounds, fonts, graphics): CC0 only.
