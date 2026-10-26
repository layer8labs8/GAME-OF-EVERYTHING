# Sky Stacker (0071 — Stack Tower)

## Rules
Drop horizontally sweeping slabs onto the top of a rising tower.
- Track width is `280`; the starting foundation slab sits at `x = 80, w = 120`.
- Each `'wait'` step sweeps the active slab horizontally and bounces off `[0, 280 - w]` (auto-dropping after `120` idle `'wait'` ticks).
- Dropping (`'drop'`):
  - **Perfect** (`|mover.x - top.x| <= 4`): snaps cleanly onto `top.x`, keeps full width (`+6` width recovery up to `120` on `streak >= 5`), and scores `20 + streak * 5`.
  - **Trimmed** (`overlap >= 4`): trims overhanging edges to the overlap interval `[left, right]`, resets `streak`, and scores `+10`.
  - **Miss** (`overlap < 4`): slab misses the tower and ends the run (`-15` reward).
- Game also terminates cleanly at `MAX_STEPS = 2400`.

## State
- `tower`: array of `{ x, w, colorIdx }` (`tower[0]` is foundation)
- `mover`: `{ x, w, dir, speed, idleTicks }`
- `height`: integer blocks stacked (`tower.length - 1`)
- `streak`: integer consecutive perfect drops
- `points`: integer `>= 0`
- `lastDrop`: `'none' | 'perfect' | 'trimmed' | 'miss'`
- `over`: boolean
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
`['wait', 'drop']` while `!isOver(state)`; `[]` when over.

## Score
`state.points`
