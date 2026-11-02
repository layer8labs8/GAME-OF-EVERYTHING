# 0184 - Reversi ("Flip Field")

Trap the computer's discs between two of yours to flip them to your colour. Whoever owns the most discs at the end wins.

## Rules

- You play blue on an 8 by 8 board that starts with four discs in the middle.
- A move must trap at least one line of the computer's discs between the new disc and one of yours.
- All trapped discs flip to your colour.
- A side with no legal move passes.
- The game ends when neither side can move. The computer loves corners and big flips.

## State

`board` (64 cells: 0 empty, 1 you, 2 computer), `over`, `steps`, `rng`.

## Actions

A cell index from 0 to 63. `legalActions` lists every move you can make now.

## Score

The number of your discs on the board.
