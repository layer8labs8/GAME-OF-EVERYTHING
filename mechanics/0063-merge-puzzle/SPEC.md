# Power Tiles (0063 — Merge Puzzle)

## Rules
Slide numbered tiles across a `4 × 4` grid in one of four directions (`'U'`, `'D'`, `'L'`, `'R'`).
- All non-zero tiles slide as far as possible in the chosen direction.
- Equal adjacent tiles along the slide merge once per step into their sum (`v + v`), adding `2 * v` to `points` and `reward`.
- Only directions that move or merge at least one tile are legal.
- After every legal slide, one random empty cell receives a `2` (`90%`) or `4` (`10%`) from `state.rng`.
- Game ends when no legal slide remains or `stepCount >= 1800`.

## State
- `grid`: `4 × 4` array of integers (`0`, `2`, `4`, `8`, ...)
- `points`: integer total merged points
- `maxTile`: integer highest tile on the board
- `stepCount`: integer `0..1800`
- `rng`: integer 32-bit PRNG state

## Actions
Subset of `['U', 'D', 'L', 'R']` that change `grid` (empty `[]` when over).

## Score
`state.points`
