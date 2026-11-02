# 0186 - Peg Jump ("Last Peg")

Jump pegs over each other and remove the ones you jump. Try to leave a single peg on the board.

## Rules

- The board is a cross of 33 holes, with one hole empty at the start.
- A peg jumps straight over a neighbouring peg into an empty hole, and the jumped peg is removed.
- Tap a peg, then the hole to jump to.
- The game ends when no jump is left.

## State

`board` (49 cells: -1 off the board, 0 hole, 1 peg), `pegs`, `steps`, `rng`.

## Actions

A jump written `"from:to"`, for example `"10:24"`. `legalActions` lists every move you can make now.

## Score

Ten points per peg removed, plus 200 for finishing with a single peg.
