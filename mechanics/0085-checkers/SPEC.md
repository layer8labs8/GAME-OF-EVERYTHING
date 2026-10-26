# 0085-checkers: Crown Draughts

Classic 8x8 draughts / checkers featuring mandatory capture jumps, king crowning, multi-jump sequences, and a deterministic heuristic AI opponent.

## State
- `board`: 8x8 array of cell values:
  - `0`: empty
  - `1`: Player man (red)
  - `2`: Player king (red crowned)
  - `-1`: AI man (black)
  - `-2`: AI king (black crowned)
- `stepCount`: integer (max 150)
- `playerPieces`: integer (0 to 12)
- `aiPieces`: integer (0 to 12)
- `turn`: `'player'` | `'ai'`
- `won`: boolean
- `stats`: `{ playerCaptures: number, aiCaptures: number }`
- `rng`: integer PRNG state

## Move Format
Actions are represented as strings `"fromRow,fromCol->toRow,toCol"`:
- E.g. `"5,2->4,3"` (diagonal standard move)
- E.g. `"5,2->3,4"` (capture jump over opponent at 4,3)

## Rules
- Regular pieces move diagonally forward:
  - Player (1) moves upward (`row - 1`).
  - AI (-1) moves downward (`row + 1`).
- Kings (2 and -2) move and capture diagonally in all 4 directions.
- Mandatory jumps: If any capture is available, non-capturing moves are illegal.
- Pieces reaching the opposite back rank are crowned kings.
- Game ends when either player has no pieces or legal moves left, or `stepCount >= 150`.

## Scoring
- Score = `(won ? 500 : 0) + playerPieces * 35 + kingsCount * 45 - aiPieces * 15 + stats.playerCaptures * 20`.
