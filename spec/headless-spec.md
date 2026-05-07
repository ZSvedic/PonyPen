# PonyPen Headless Core

The game is first implemented as a headless JavaScript model/API.

The core owns all game rules, level parsing, validation, state transitions, scoring, and events. It does not read files, write output, access DOM APIs, or depend on CLI/web runtimes.

Shells pass level text and player actions into the core, then render returned state/events.

## Levels

- Dir [levels/](./levels/) contains `{id}-{name}-{maxScore}.txt` files with solved levels.
  `maxScore` is the max solved board score.
- To get the initial state replace `#` in solved with `.`; the replacement count is `maxRocks`.
- Invalid levels are rejected with the same message text in every shell:
  - If no `#` tiles: `Level has no solution.`
  - If the solution `maxScore` is 0: `Pony is not enclosed by the solution.`
  - If removing any single rock from the solved board yields a score greater than or equal to the solved board's score, the rock is dead weight: `Level has a suboptimal solution.`
- Max board size is 30x30.

## API

`createGame(levelText, options?)` returns a game object.

Game state exposes:
- level name, width, height, maxRocks, maxScore
- immutable initial board
- current board
- placed rock count
- score result after scoring

Game state also exposes `enclosedMap`: a 2D boolean array (same dimensions as the board), true for each tile reachable from the pony and enclosed by rocks/water; recomputed after every `toggleRock()` and `reset()`; all false when the pony can escape.

Actions:
- `toggleRock(row, col)`
- `reset()`
- `score()`

Events returned by actions:
- `rock-added`
- `rock-removed`
- `reset`
- `scored`
- `error`

Coordinates are 1-based row/column values. Front ends may display coordinates differently, but must call the core with the same model coordinates.
