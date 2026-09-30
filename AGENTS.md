# Repository Notes

- This is a dependency-free static game; `index.html` loads the classic script `game.js` directly. There is no build step or automated test/lint setup.
- Run it by opening `index.html` or with `npx serve .` (then visit `http://localhost:3000`). Verify gameplay in a browser.
- `README.md` mentions power-ups and a special "estrella fugaz" asteroid type; neither exists in `game.js`. `game.js` is the source of truth for current behavior.
- The canvas is fixed at 800×600 in `index.html`; the matching world dimensions are `W` and `H` in `game.js`. Keep these values in sync when changing the game size.
- Game entities, input, update, drawing, and the `requestAnimationFrame` loop all live in `game.js`; preserve the direct script setup unless deliberately introducing a module/build system.
- Input handling: `keys[e.code]` tracks held keys; `pressed(e.code)` consumes a one-shot edge event. Use `pressed()` for new discrete actions (shoot, restart), `keys[]` for continuous ones (turn, thrust).
- UI strings shown on canvas (HUD, overlays) are Spanish; keep new player-facing text in Spanish to match.
