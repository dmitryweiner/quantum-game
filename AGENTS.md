# Notes for AI agents (and humans) working on this repo

Game design, architecture and milestones live in [PLAN.md](PLAN.md). This file
is about **how to work** here.

## Workflow

- Commit and push milestones straight to `main` (no PRs, no branch
  protection). Every push deploys to https://dmitryweiner.github.io/quantum-game/
  and the owner checks it on a phone.
- Before committing: `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run build` must all pass.
- **Dev tools are welcome in the repo.** If you write a script, page or helper
  for development that could be useful again (previews, simulations, checkers,
  generators), commit it instead of throwing it away. Keep it out of the
  production build (e.g. a root-level `*.html` page other than `index.html`,
  or a `scripts/` file) and mention it in this file.

## Environment

- Node 24 (`.nvmrc`). If the default `node` is older, use `fnm exec --using=24 npm …`.
- Dev server: `npx vite --port 5199 --strictPort` (5173 may be taken by another project).
  `--host` is on, so a phone on the same Wi‑Fi can open it too.
- TypeScript is pinned to `~6.0` because `typescript-eslint` does not support 7 yet.

## Visual checks — always include phone sizes

The game is mobile-first. After any change to layout, HUD, panels or
controls, check it **on phone sizes as well as desktop**:

1. Start the dev server and open **`/preview.html`** — a dev-only page (not
   built) that shows the game in two iframes: phone portrait 390×844 and
   phone landscape 844×390.
   - `?level=ch3-02` opens a level directly (the game itself also accepts
     `?level=` in its own URL);
   - `?w=360&h=740` shows one custom size.
2. Take a screenshot and look at both frames: header not wrapping into a
   column, panels fully reachable, map not hidden under the HUD or the thumb
   sticks, text readable.
3. Touch controls only appear after a touch. In a desktop browser set
   `scene.controls.touch.used = true` on the level scene to see them.

### Browser automation tips

- An automated browser tab is often _hidden_, so `requestAnimationFrame` (and
  with it Phaser's game loop) does not run. Dev builds expose `window.__game`;
  step frames by hand:
  ```js
  const g = __game;
  for (let i = 0; i < 60; i++) {
    g.__t = (g.__t || performance.now()) + 16.7;
    g.step(g.__t, 16.7);
  }
  ```
  In `/preview.html` do the same for each `iframe.contentWindow.__game`.
- Screenshot coordinates may not match CSS pixels; to "tap" a world cell,
  call the scene's handlers with coordinates from the camera instead of
  clicking blindly.
- The level scene is `__game.scene.getScene('Level')`; its `sim` (LevelSim)
  holds the whole game state.

## Code map

- `src/quantum/` — engine-free physics (wave on a lattice, measurements,
  entangled pair, qubit, Rabi system). Fully unit-tested.
- `src/game/systems/LevelSim.ts` — all game rules without Phaser; tests play
  levels headlessly through it.
- `tests/levels.test.ts` — **simulation playtests**: every level is played
  hundreds of times by scripted strategies to prove that the quantum strategy
  wins and the classical one loses (PLAN.md §1.4). When designing or tuning a
  level, write the strategies first and tune the numbers until the test
  passes; don't guess.
- `src/strings/` + `src/i18n/` — every player-facing text, in English and
  Russian. A missing translation fails typecheck or tests.
