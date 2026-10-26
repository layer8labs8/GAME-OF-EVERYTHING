# Pixel Jumper (0033 — 2D Platformer)

## Rules
Ascend through ascending floating ledges, collect sparkling gold coins, and reach the summit portal gate.
- **Physics**: Player has gravity, left/right horizontal velocity with ground friction, and jump impulses when grounded.
- **Actions**: `['left', 'right', 'jump', 'wait']`.
- **Collectibles**: Each collected coin awards `+50` points.
- **Summit Portal**: Reaching the summit portal with at least `4` coins clears the level with a `+300` victory bonus.
- **Hazards**: Falling off the bottom of the arena costs `1` life (starts with `3` lives) and respawns the hero at the base platform.
- The game terminates when lives reach `0`, the portal is activated, or at `MAX_STEPS = 1200`.

## State
- `player`: `{ x, y, vx, vy, grounded }`
- `coins`: array of `{ x, y, collected }`
- `coinsCollected`: integer
- `lives`: integer `0..3`
- `points`: integer `>= 0`
- `won`: boolean
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
`['left', 'right', 'jump', 'wait']` while `!isOver(state)`; `[]` when over.

## Score
`state.points`
