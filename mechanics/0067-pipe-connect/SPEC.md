# Flow Conduit (0067 — Pipe Connect)

## Rules
Connect the fluid source at top-left cell `0` (`(0,0)`) to the drain at bottom-right cell `24` (`(4,4)`) on a `5 × 5` conduit grid within `55` rotations.
- Each cell stores a 4-bit opening mask (`N=1`, `E=2`, `S=4`, `W=8`).
- Rotating a cell (`action` in `0..24`) turns its pipe 90 degrees clockwise: `((mask << 1) | (mask >> 3)) & 15`.
- Fluid flows from cell `0` across adjacent cells whose touching sides both have open ports (`wet[i] === true`).
- Only cells with rotatable pipes (`pipes[i] !== 0 && pipes[i] !== 15`) are legal actions.
- Game ends when `wet[24]` becomes `true` (`connected = true`, win) or `movesLeft === 0` (lose).

## State
- `size`: `5`
- `pipes`: array of 25 integers (`0..15` bitmasks)
- `wet`: array of 25 booleans
- `movesLeft`: integer `0..55`
- `stepCount`: integer `0..55`
- `connected`: boolean
- `rng`: integer 32-bit PRNG state

## Actions
Sorted array of indices `0..24` where `pipes[i] !== 0 && pipes[i] !== 15` (empty `[]` when over).

## Score
`connected ? 100 + movesLeft * 3 : wetCount * 4`
