# Hazard Grid (0070 — Minesweeper)

Clear the grid without touching a mine. Numbers show how many mines are next to each tile.

## Rules
Clear all safe tiles on a `7 × 7` grid (`49` cells) hiding `7` hazard mines without detonating any mine.
- **First-Move Safety**: If the very first revealed cell (`revealedCount === 0`) contains a mine, that mine is relocated to the next free cell and neighbor counts are updated before revealing, guaranteeing a safe opening move.
- **Flood Reveal**: Revealing a safe cell with `0` adjacent mines automatically flood-reveals its 8-directional safe neighbors recursively.
- **Scoring**:
  - `+10` points per newly revealed safe cell.
  - `+100` bonus when all `42` safe cells are cleared (`outcome = 'won'`).
  - Detonating a mine ends the game (`outcome = 'lost'`, `-25` step reward).

## State
- `mines`: array of 49 booleans
- `counts`: array of 49 integers (`0..8`)
- `revealed`: array of 49 booleans
- `revealedCount`: integer (`0..42`)
- `points`: integer (`>= 0`)
- `outcome`: `'playing' | 'won' | 'lost'`
- `explodedCell`: integer (`-1` or `0..48`)
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
Array of unrevealed cell indices `0..48` (empty `[]` when `isOver(state)` is `true`).

## Score
`state.points`

## Levels

The game has ten levels that get harder step by step, listed in `levels.json` and `CAMPAIGN` in `www/logic.js`. `createState(seed, level)` loads one, and `createState(seed)` still plays the classic game. `solver.js` proves each level can be finished through the real rules. Beating a level unlocks the next.
