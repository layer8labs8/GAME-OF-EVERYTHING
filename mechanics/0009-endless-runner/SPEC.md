# Neon Sprint (0009 — Endless Runner)

## Rules
Sprint down an endless neon cyber highway across 3 lanes (`Lanes 0, 1, 2`), jumping hurdles, sliding under laser beams, and dodging barricades.
- **Actions**: `['left', 'right', 'jump', 'slide', 'wait']`.
  - `'left'` / `'right'`: switch lanes (Lanes 0, 1, 2).
  - `'jump'`: vaults into the air for `8` ticks to clear low hurdles.
  - `'slide'`: slides low along the ground for `8` ticks to pass beneath high laser barriers.
  - `'wait'`: maintains current course and posture.
- **Obstacles**:
  - **Low Hurdle**: avoidable by jumping or changing lanes.
  - **High Laser**: avoidable by sliding or changing lanes.
  - **Barricade**: impassable vertically; must switch lanes.
  - **Power Orb**: collectible item awarding `+30` points.
- **Collisions & Health**:
  - Colliding with an obstacle costs `1` shield (starts with `3` shields) and resets combo streak.
  - Shield items occasionally spawn to repair lost shields (up to `3`).
- **Game Over**: Concludes when shields reach `0` or after `MAX_STEPS = 1500`.

## State
- `lane`: integer `0..2`
- `jumping`: integer `0..8` (ticks remaining in jump)
- `sliding`: integer `0..8` (ticks remaining in slide)
- `obstacles`: array of `{ id, lane, y, type }` (type: `'hurdle'`, `'laser'`, `'barrier'`, `'orb'`)
- `shields`: integer `0..3`
- `distance`: integer `>= 0`
- `points`: integer `>= 0`
- `streak`: integer
- `speed`: number
- `spawnTimer`: integer
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
`['left', 'right', 'jump', 'slide', 'wait']` while `!isOver(state)`; `[]` when over.

## Score
`state.points`
