# 0183 - Mancala ("Seed Bowls")

Scoop up the seeds from one bowl and drop them one by one around the board. Collect more seeds in your store than the computer.

## Rules

- Each side has six bowls with four seeds, plus one store.
- Pick a bowl on your side. Its seeds are sown one per bowl, moving to the right and around the board, skipping the other store.
- If your last seed lands in your store, you move again.
- If your last seed lands in an empty bowl on your side, you capture it and the seeds opposite.
- When one side is empty the other side keeps what is left. The bigger store wins.

## State

`pits` (14 numbers: 0-5 your bowls, 6 your store, 7-12 computer bowls, 13 computer store), `over`, `steps`, `rng`.

## Actions

A bowl number from 0 to 5. `legalActions` lists every move you can make now.

## Score

The number of seeds in your store.
