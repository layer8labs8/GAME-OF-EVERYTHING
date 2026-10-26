# Orb Popper (0030 — Bubble Shooter)

## Rules
Aim and launch colored orbs from a bottom cannon into a suspended ceiling grid (`8 × 10`) of colored bubbles (`1..4`).
- **Aim & Launch**: Choose a launch angle from `[-60, -45, -30, -15, 0, 15, 30, 45, 60]` degrees. The orb travels upward, bouncing off side walls until it sticks to the ceiling or an adjacent orb.
- **Cluster Match**: If 3 or more matching colored orbs connect, they burst and dissolve (`20` points per popped orb).
- **Floating Drop**: Any orbs that become disconnected from the ceiling row lose support and drop (`40` bonus points per dropped orb).
- **Ceiling Descent**: Every `6` shots, the ceiling descends by 1 row and a new top row spawns.
- **Game Over / Win**:
  - If any orb breaches row `8` (the lower baseline), the game ends in defeat.
  - Clearing all orbs from the grid wins with a `+500` victory bonus.
  - The game concludes after at most `60` shots.

## State
- `grid`: array of 80 integers (`0` empty, `1..4` colored orbs)
- `currentOrb`: integer (`1..4`)
- `nextOrb`: integer (`1..4`)
- `shotsLeft`: integer (`0..60`)
- `shotsUntilDrop`: integer (`0..6`)
- `points`: integer `>= 0`
- `lastPopped`: integer
- `lastDropped`: integer
- `won`: boolean
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
Array of launch angles `[-60, -45, -30, -15, 0, 15, 30, 45, 60]` while `!isOver(state)`; `[]` when over.

## Score
`state.points`
