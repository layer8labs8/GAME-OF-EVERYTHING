# Beat Pulse (0170 — Rhythm)

## Rules
Tap along to descending rhythmic notes across a 4-lane highway (`Lanes 0, 1, 2, 3`) as they cross the bottom target receptors (`y = 540`).
- **Timing Windows**:
  - **Perfect** (`|dist| <= 16px`): `100 × multiplier`, `+2` health, increments streak.
  - **Good** (`|dist| <= 36px`): `50 × multiplier`, `+1` health, increments streak.
  - **OK** (`|dist| <= 60px`): `25`, increments streak.
  - **Miss** (passed note or off-beat tap): resets streak to `0`, `-5` to `-10` penalty, deducts health.
- **Streak Multiplier**: Every `10` consecutive notes increases the score multiplier up to `4x`.
- **Survival & Completion**: Health starts at `100`. Surviving all `400` steps of the track awards a `+300` full-combo completion bonus.
- The game terminates if health reaches `0` or after `400` track steps.

## State
- `notes`: array of active `{ id, lane, y, hit }`
- `health`: integer `0..100`
- `streak`: integer `>= 0`
- `multiplier`: integer `1..4`
- `points`: integer `>= 0`
- `lastRating`: `'none' | 'perfect' | 'good' | 'ok' | 'miss'`
- `misses`: integer
- `won`: boolean
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
`['wait', 'tap_0', 'tap_1', 'tap_2', 'tap_3']` while `!isOver(state)`; `[]` when over.

## Score
`state.points`
