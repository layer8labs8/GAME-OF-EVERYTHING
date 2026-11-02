# 0182 - Dots and Boxes ("Box Claim")

Draw lines between dots and close boxes to claim them. Closing a box gives you another turn, and the most boxes wins.

## Rules

- The board has 4 by 4 boxes.
- On your turn you draw one line between two neighbouring dots.
- Drawing the fourth side of a box claims it and you move again.
- The game ends when every box is claimed.
- The computer takes free boxes and tries not to draw a third side.

## State

`h` (20 horizontal lines), `v` (20 vertical lines), `owner` (16 boxes: 0 none, 1 you, 2 computer), `player`, `computer`, `steps`, `rng`.

## Actions

A line such as `"h:0:2"` (row 0, column 2) or `"v:1:3"`. `legalActions` lists every move you can make now.

## Score

Ten points per box you claim.
