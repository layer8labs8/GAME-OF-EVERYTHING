# Gem Cascade (0041 — Match-3)

## Rules
Swap adjacent gems on a `6 × 6` grid (`36` tiles) containing 5 gem types (`1..5`) to align 3 or more matching gems in a horizontal or vertical line.
- A swap is only legal if it immediately results in at least one match of 3 or more gems.
- Matched gems dissolve, scoring points (`30` for 3, `60` for 4, `120` for 5+).
- Gravity shifts remaining gems downward into vacant cells, and new gems spawn at the top from the deterministic PRNG.
- Subsequent matches trigger cascading chain reactions with escalating combo score multipliers (`1x, 2x, 3x...`).
- The player starts with `25` moves. Each legal swap consumes `1` move.
- The game concludes when `movesLeft <= 0` or when no legal swaps remain.

## State
- `board`: array of 36 integers (`1..5`)
- `movesLeft`: integer (`0..25`)
- `points`: integer (`>= 0`)
- `lastCleared`: integer (number of gems cleared in last move)
- `lastCombo`: integer (highest cascade combo in last move)
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
Array of `{ cell: 0..35, dir: 'right' | 'down' }` that form at least one match when swapped (`[]` when game is over).

## Score
`state.points`
