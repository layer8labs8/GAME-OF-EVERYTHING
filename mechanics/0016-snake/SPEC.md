# Neon Serpent (0016 — Snake)

## Rules
Control a growing serpent on a `12 × 16` grid (`x` in `0..11`, `y` in `0..15`).
- The serpent starts at length 3 at `[(5,8), (4,8), (3,8)]` moving right (`'R'`).
- On each step, choose a cardinal direction (`'U'`, `'D'`, `'L'`, `'R'`) other than the immediate 180-degree reverse of `dir`.
- Stepping onto `food` grows the serpent by 1, increments `eaten`, adds `10` points, resets `hunger` to `0`, and spawns new food on a random empty cell.
- Stepping onto an empty cell (including the tail cell that vacates on a non-eating move) advances the serpent without growing and increments `hunger`.
- Hitting a wall, hitting a body segment, exceeding `maxHunger` (`140` non-eating steps), or reaching `maxSteps` (`2400`) ends the game. Filling the entire grid (`192` cells) wins the game.

## State
- `w`: `12`, `h`: `16`
- `snake`: array of `{ x, y }` from head (`index 0`) to tail
- `dir`: current heading `'U' | 'D' | 'L' | 'R'`
- `food`: `{ x, y }` or `null` when board is full
- `eaten`: integer apples eaten
- `hunger`: integer steps since last food
- `stepCount`: integer total steps
- `alive`: boolean
- `won`: boolean
- `rng`: integer 32-bit PRNG state

## Actions
Array of `'U'`, `'D'`, `'L'`, `'R'` excluding the opposite of `state.dir` (empty when `isOver(state)` is `true`).

## Step Rules
- Throws `Error` without mutating `state` if `action` is not in `legalActions(state)`.
- Reward: `+10` when eating food (`+110` if eating fills the last cell), `-10` on wall/body collision, `0` otherwise.

## Score
`state.eaten * 10 + (state.won ? 100 : 0)`
