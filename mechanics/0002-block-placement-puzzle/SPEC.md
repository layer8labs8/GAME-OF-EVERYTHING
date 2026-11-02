# 0002 - Block Placement Puzzle ("Block Master")

Drag three blocks onto an 8 by 8 board and fill whole rows or columns to clear them. The game ends when none of your blocks fits anywhere.

## Rules

- You get three pieces at a time and may place them in any order. Pieces cannot be rotated.
- A piece can go anywhere all its cells are empty and inside the board.
- Every full row and column clears at the same moment.
- When all three pieces are used, three new ones appear. At least one of them always fits, if any cell is free.
- The game ends when no remaining piece fits.

## State

- `board`: 8 rows of 8 numbers, 0 for empty and 1 to 6 for a colour.
- `tray`: three entries, each `{ shape, color }` or `null` once used.
- `score`, `combo`.
- `moves`: bot moves taken so far.
- `over`: true once the game has ended.
- `rng`: integer state of the seeded random generator.

## Actions

A string `"slot:row:col"`, for example `"0:3:4"` places tray piece 0 with its top-left cell at row 3, column 4. `legalActions` lists every placement that fits.

## Step rules

`step(state, action)` places the piece, clears full lines, refills the tray when it is empty and ends the game when nothing fits. The reward is the score gained. A bot game also ends after 2000 moves, so a bot cannot play forever. People use `place(state, slot, row, col)`, which has no such limit.

## Score

A placed piece scores one point per cell. Clearing `n` lines at once adds `10 * n * n`. Clearing lines on consecutive moves builds a combo that adds 10 points per step of the combo. A move that clears nothing resets the combo.
