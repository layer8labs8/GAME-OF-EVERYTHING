# 0046 - Mahjong ("Mahjong Solitaire")

## Concept & Theme
A serene yet deeply strategic ancient tile-matching solitaire game. Hand-carved bone and ivory tiles bearing classical Chinese symbols (Bamboo, Characters, Dots, Dragons, Winds) are arranged in layered pyramidal configurations. Operatives match and clear open pairs to dismantle the layout.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Procedurally builds a multi-tiered solvable layout of paired tiles (36 tiles in 18 pairs).
- `legalActions(state)`: Returns all valid `match_<id1>_<id2>` pairs where both tiles are currently unblocked ("free") and share the same suit/symbol.
- `step(state, action)`: Mutates state in place, removes the matched pair, recalculates unblocked tiles, updates combo streak, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if all tiles are cleared (victory), no legal matching pairs remain (stalemate/loss), or step limit reached.
- `score(state)`: Returns total points based on pairs matched, chain combo bonus, and board clear reward.

## Rules of Free Tiles
A tile is free (selectable) if:
1. No tile directly covers it from an upper tier (`z + 1`).
2. At least one of its lateral flanks (left or right, `x - 1` or `x + 1`) on the same tier is unblocked by an adjacent tile.

## Tile Suits
- **Bamboo** (1B..4B)
- **Characters** (1C..4C)
- **Dots** (1D..4D)
- **Honors**: Red Dragon (DR), Green Dragon (DG), East Wind (WE)

## Victory & Defeat
- **Victory**: Remove all 36 tiles from the board (`tiles.length === 0`).
- **Defeat**: No free matching pairs remain while tiles are still on the board.
