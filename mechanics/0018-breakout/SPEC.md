# Shard Breaker (0018 — Breakout)

## Rules
Deflect an energy sphere with a bottom paddle (`y = 414`) inside a `312 × 440` chamber to shatter 5 rows of 8 crystal shards.
- Actions move the paddle left (`'L'`), stay (`'S'`), or move right (`'R'`).
- Striking a shard destroys it and awards tier points (`10..50` from bottom to top row).
- Clearing every shard advances `wave`, awards `+100` bonus points, rebuilds the wall, and increases ball speed.
- Missing the sphere costs `1` life (`3` lives initially). Game ends at `0` lives or `maxSteps = 2200`.

## State
- `w`: `312`, `h`: `440`, `paddleW`: `68`
- `paddleX`: number
- `ball`: `{ x, y, vx, vy, r }`
- `bricks`: array of `{ row, col, x, y, w, h, points }`
- `lives`: integer `0..3`
- `wave`: integer `>= 1`
- `points`: integer `>= 0`
- `stepCount`: integer `0..2200`
- `rng`: integer 32-bit PRNG state

## Actions
`['L', 'S', 'R']` while `!isOver(state)`, empty `[]` when over.

## Step Rules
- Throws `Error` without mutating `state` on illegal action.
- Reward: shard points on break, `+100` on wave clear, `-15` on lost ball.

## Score
`state.points`
