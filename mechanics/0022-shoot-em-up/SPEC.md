# Star Vanguard (0022 — Shoot 'Em Up)

## Rules
Defend your sector from descending alien raider squadrons in a vertical scrolling space arena (`360 × 640`).
- The player starship maneuvers horizontally along the bottom baseline (`y = 580`) and fires twin plasma bolts.
- Actions: `['left', 'right', 'stay', 'fire']`.
- Destroying an enemy awards `100 × multiplier` points and increments the streak multiplier (up to `5x`).
- When an alien collides with the starship or breaches past the baseline, the ship loses `1` shield (starts with `3` shields) and the streak multiplier resets to `1x`.
- Surviving all `10` waves awards a `+500` fleet defense bonus.
- The game terminates when shields drop to `0`, all waves are cleared, or at `MAX_STEPS = 2000`.

## State
- `player`: `{ x, speed, fireCooldown }`
- `bullets`: array of `{ x, y, vy }`
- `enemies`: array of `{ x, y, vx, vy, hp, type }`
- `shields`: integer `0..3`
- `wave`: integer `1..10`
- `waveEnemiesLeft`: integer
- `spawnTimer`: integer
- `multiplier`: integer `1..5`
- `points`: integer `>= 0`
- `won`: boolean
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
`['left', 'right', 'stay', 'fire']` while `!isOver(state)`; `[]` when over.

## Score
`state.points`
