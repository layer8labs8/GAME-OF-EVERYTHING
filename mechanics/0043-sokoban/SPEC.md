# Crate Keeper (0043 — Sokoban)

## Rules
The keeper stands inside a walled room containing crates (`$`) and marked floor targets (`.`).
- Stepping into floor (` `) or a target (`.`) moves the keeper (`@` on floor, `+` on target).
- Stepping into a crate (`$` or `*`) pushes it one tile in the same direction if the tile beyond is floor or target.
- Crates cannot be pulled, pushed through walls (`#`), or pushed into another crate.
- A level is solved when every crate rests on a target (`*` and no loose `$`).

## State (Bot Interface)
- `levelIndex`: integer `0..11` selecting one of the 12 verified levels
- `grid`: array of equal-length row strings representing the current board
- `par`: integer shortest-solution length for the selected level
- `stepCount`: integer moves taken so far (`0..200`)
- `maxSteps`: `200`
- `solved`: boolean
- `rng`: integer 32-bit PRNG state

## Actions
Directions `'U'`, `'D'`, `'L'`, `'R'` that change `grid` (blocked moves are excluded from `legalActions`).

## Step Rules
- Throws an `Error` without mutating `state` if `action` is not in `legalActions(state)`.
- Applies `move(state.grid, action)`, increments `stepCount`, updates `solved = isSolved(state.grid)`.
- Reward: `-1` step cost, `+10 * (newTargets - oldTargets)` for crates moved onto/off targets, and `+100` bonus when `solved` becomes `true`.
- Game ends (`done = true`) when `solved` is `true`, `stepCount >= maxSteps`, or no legal moves exist.

## Score
`25 * cratesOnTargets + (solved ? Math.max(0, 100 - Math.max(0, stepCount - par) * 2) : 0)`
