# 0185 - Nonogram ("Hidden Picture")

Use the number clues to work out which squares to fill. When every row and column matches, a small picture appears.

## Rules

- Each clue lists the runs of filled squares in that row or column, in order.
- Tap a square to fill it, and tap again to clear it.
- You win when every row and column matches its clues.
- You have 300 taps.

## State

`clues` (`rows` and `cols` lists of runs), `grid` (25 cells: 0 empty, 1 filled), `picture`, `won`, `steps`, `rng`.

## Actions

A cell index from 0 to 24. `legalActions` lists every move you can make now.

## Score

1000 minus 10 for each tap on a win, at least 100. Otherwise 0.
