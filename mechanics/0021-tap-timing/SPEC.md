# Pulse Lock (0021 — Tap Timing)

## Rules
A needle sweeps back and forth across a `0..100` track toward a shifting target zone (`target`, `goodRadius`, `perfectRadius`).
- `'wait'` advances the needle by `dir * speed`, reflecting off `0` and `100`. Waiting `160` consecutive steps without tapping causes a timeout miss (`lives -= 1`, `streak = 0`).
- `'tap'` locks the needle at its current position:
  - `|pos - target| <= perfectRadius`: **Perfect** (`25 + streak * 5` points, `streak += 1`, `locks += 1`, spawns next faster/narrower target).
  - `|pos - target| <= goodRadius`: **Good** (`10 + streak * 2` points, `streak += 1`, `locks += 1`, spawns next target).
  - `|pos - target| > goodRadius`: **Miss** (`lives -= 1`, `streak = 0`, `-10` reward).
- Starts with `3` lives. Ends when `lives <= 0`, `locks >= 25` (`+100` vault bonus), or `stepCount >= 1800`.

## State
- `pos`: number `0..100`, `dir`: `1 | -1`, `speed`: number
- `target`: number `18..82`, `goodRadius`: number, `perfectRadius`: number
- `locks`: integer `0..25`, `streak`: integer `>= 0`
- `lives`: integer `0..3`, `idleTicks`: integer `>= 0`
- `points`: integer `>= 0`, `lastGrade`: `'none' | 'perfect' | 'good' | 'miss'`
- `stepCount`: integer `0..1800`, `rng`: integer 32-bit PRNG state

## Actions
`['wait', 'tap']` while `!isOver(state)`, empty `[]` when over.

## Score
`state.points`
