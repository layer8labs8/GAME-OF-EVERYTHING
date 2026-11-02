# 0181 - Four in a Row ("Tower Four")

Drop discs into seven columns and they fall to the lowest free space. Line up four before the computer does.

## Rules

- You play blue and move first.
- A disc falls to the lowest empty row of the column you pick.
- Four in a line across, down or on a diagonal wins.
- A full board is a draw.
- The computer wins when it can, blocks your wins and prefers the middle.

## State

`board` (42 cells, row by row from the top: 0 empty, 1 you, 2 computer), `winner`, `steps`, `rng`.

## Actions

A column number from 0 to 6. `legalActions` lists every move you can make now.

## Score

100 for a win, 50 for a draw, 0 for a loss.
