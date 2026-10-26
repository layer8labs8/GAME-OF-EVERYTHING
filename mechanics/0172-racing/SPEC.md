# Speedway Rush (0172 — Racing)

## Rules
Maneuver a high-performance race car across a 3-lane highway (`Lanes 0, 1, 2`), dodging slower traffic and collecting bonus fuel canisters.
- **Lanes**: 3 traffic lanes centered at `x = 90` (Left), `x = 180` (Center), and `x = 270` (Right).
- **Actions**: `['left', 'right', 'nitro', 'wait']`.
  - `'left'`: shifts left one lane (clamped at Lane 0).
  - `'right'`: shifts right one lane (clamped at Lane 2).
  - `'nitro'`: activates turbo boost (advances distance twice as fast, earns `2×` points for that tick).
  - `'wait'`: cruises in current lane.
- **Traffic**: Rival cars spawn at the top and move downward at relative speeds.
- **Collisions & Fuel**:
  - Colliding with a rival car costs `1` hull point (starts with `3` hull points) and resets combo streak.
  - Fuel canisters award `+40` points and `+1` hull recovery (up to maximum `3`).
- **Game Over**: Concludes when hull points drop to `0` or after `MAX_STEPS = 1500`.

## State
- `lane`: integer `0..2`
- `traffic`: array of `{ id, lane, y, speed, type }`
- `items`: array of `{ id, lane, y, type }`
- `hull`: integer `0..3`
- `distance`: integer `>= 0`
- `points`: integer `>= 0`
- `nitroActive`: boolean
- `streak`: integer
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
`['left', 'right', 'nitro', 'wait']` while `!isOver(state)`; `[]` when over.

## Score
`state.points`
