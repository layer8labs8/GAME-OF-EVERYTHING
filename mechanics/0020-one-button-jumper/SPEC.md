# Roof Jumper (0020 — One-Button Jumper)

## Rules
Sprint across an endless skyline at `playerX = 64` while obstacles scroll left across a `320`-wide track.
- Actions: `'run'` or `'jump'`.
- `'jump'` when grounded (`y === 0`) launches upward at `vy = 11.5`. Holding `'jump'` while rising (`vy > 0`) softens gravity (`-0.65` vs `-1.15`) for higher vaults.
- Obstacles scroll left at rising speed (`4.8 + min(3.2, cleared * 0.12)`). Overlapping an obstacle (`[x, x + w]` vs `[playerX - 10, playerX + 10]` while `y < h`) ends the run (`alive = false`, `-20` reward).
- Passing an obstacle awards `+10` points (`cleared += 1`). Each step survived adds `+1` distance point. Run concludes on crash or at `maxSteps = 2000`.

## State
- `w`: `320`, `playerX`: `64`, `playerW`: `20`
- `y`: number `>= 0` (height above ground)
- `vy`: number
- `obstacles`: array of `{ x, w, h, passed }`
- `spawnGap`: number distance until next obstacle
- `cleared`: integer obstacles cleared
- `points`: integer score
- `stepCount`: integer `0..2000`
- `alive`: boolean
- `rng`: integer 32-bit PRNG state

## Actions
`['run', 'jump']` while `!isOver(state)`, empty `[]` when over.

## Score
`state.points`
