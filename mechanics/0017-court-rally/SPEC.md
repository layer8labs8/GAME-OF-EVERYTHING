# Court Rally (0017)

## Rules
Vertical court (`300 × 440`) pitting the player's bottom paddle (`y = 416`) against an automated top paddle (`y = 24`).
- Each step moves the player's paddle left (`'L'`), stays (`'S'`), or moves right (`'R'`).
- Deflecting the ball angles its return based on where it strikes the paddle and slightly accelerates the rally.
- Passing the top baseline scores `1` point for the player; passing the bottom baseline scores `1` point for the opponent.
- First side to `5` points wins (`winScore = 5`), or the match concludes at `maxSteps = 1600`.

## State
- `w`: `300`, `h`: `440`, `paddleW`: `64`
- `playerX`: number, `aiX`: number
- `ball`: `{ x, y, vx, vy, r }`
- `playerScore`: integer `0..5`
- `aiScore`: integer `0..5`
- `rallies`: integer player paddle returns
- `stepCount`: integer `0..1600`
- `rng`: integer 32-bit PRNG state

## Actions
`['L', 'S', 'R']` while `!isOver(state)`, empty `[]` when over.

## Step Rules
- Throws `Error` without mutating `state` on illegal action.
- Reward: `+1` per player paddle return, `+15` per point scored (`+45` on match-winning point), `-10` per point conceded.

## Score
`Math.max(0, state.playerScore * 100 + state.rallies * 5 - state.aiScore * 20)`
