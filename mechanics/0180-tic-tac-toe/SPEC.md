# 0180 - Tic-Tac-Toe ("Three Stones")

Take turns with the computer on a three by three board. The first to get three in a line wins.

## Rules

- You play blue and move first, then the computer plays red.
- Three of your stones in a row, column or diagonal wins.
- A full board with no line is a draw.
- The computer takes a win, blocks your win and likes the centre, so you need two threats at once to beat it.

## State

`board` (9 cells: 0 empty, 1 you, 2 computer), `winner` (null, "player", "computer" or "draw"), `steps`, `rng`.

## Actions

A cell index from 0 to 8. `legalActions` lists every move you can make now.

## Score

100 for a win, 50 for a draw, 0 for a loss.
