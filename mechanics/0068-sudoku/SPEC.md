# Number Box (0068 — Sudoku)

Fill the grid with 1 to 4 so no number repeats in a row, column or box.

## Rules
Complete a `4 × 4` grid with digits `1..4` so every row, every column, and every `2 × 2` corner box contains `1, 2, 3, 4` once each.
- Each seeded puzzle has `7` given clues and `9` empty cells (`0`), verified during generation to have a **unique** solution.
- An action `{ cell: 0..15, digit: 1..4 }` attempts to place `digit` in an empty `cell`:
  - Correct (`digit === solution[cell]`): fills `board[cell] = digit`, awards `+15` points (`+80` bonus when the 16th cell completes the grid).
  - Incorrect: leaves `board[cell]` empty, increments `mistakes` (`-10` reward).
- Three mistakes (`mistakes >= 3`) end the game.

## State
- `board`: array of 16 integers (`0` empty, `1..4` filled)
- `given`: array of 16 booleans
- `solution`: array of 16 integers (`1..4`)
- `mistakes`: integer `0..3`
- `points`: integer `>= 0`
- `solved`: boolean
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
Array of `{ cell, digit }` for every index `cell` where `board[cell] === 0` and `digit` in `1..4` (empty `[]` when over).

## Score
`state.points`

## Levels

The game has ten levels that get harder step by step, listed in `levels.json` and `CAMPAIGN` in `www/logic.js`. `createState(seed, level)` loads one, and `createState(seed)` still plays the classic game. `solver.js` proves each level can be finished through the real rules. Beating a level unlocks the next.
