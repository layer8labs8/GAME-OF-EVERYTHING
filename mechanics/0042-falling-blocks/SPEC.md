# Quad Drop (0042 — Falling Blocks)

## Rules
Arrange falling 4-cell polyominoes inside a `10 × 20` well (`x` in `0..9`, `y` in `0..19`).
- Actions: `'left'`, `'right'`, `'rotate'`, `'down'`, `'drop'`.
- `'left'` / `'right'` shifts horizontally if unobstructed; `'rotate'` rotates 90 degrees clockwise (with `±1` wall kick). After `3` lateral/rotate actions at the same height (`stallCount >= 3`), gravity pulls the active piece down 1 row automatically.
- `'down'` advances the piece 1 row, locking it onto the board if blocked below.
- `'drop'` drops the piece straight to its lowest valid row (`+1` point per row dropped) and locks immediately.
- Completed horizontal rows clear simultaneously, awarding `100 / 300 / 500 / 800` points for `1 / 2 / 3 / 4` rows.
- Game ends (`toppedOut = true`) if the next piece cannot spawn at the top, or at `maxSteps = 2400`.

## State
- `w`: `10`, `h`: `20`
- `board`: `20 × 10` array of integers (`0` empty, `1..7` color)
- `piece`: `{ kind: 0..6, cells: [[dx,dy],...], x, y, color: 1..7 }`
- `nextKind`: integer `0..6`
- `stallCount`: integer `0..3`
- `lines`: integer total cleared rows
- `points`: integer score
- `stepCount`: integer `0..2400`
- `toppedOut`: boolean
- `rng`: integer 32-bit PRNG state

## Actions
`['left', 'right', 'rotate', 'down', 'drop']` while `!isOver(state)`, empty `[]` when over.

## Score
`state.points`
