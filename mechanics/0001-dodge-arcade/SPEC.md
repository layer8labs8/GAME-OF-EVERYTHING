# 0001 - Dodge Arcade ("Falling Rocks")

Slide your ship left and right to dodge rocks falling from the sky. Rocks come faster the longer you last, and one hit ends the run.

## Rules

- The ship stays near the bottom of a 360 by 640 screen and only moves sideways, up to 420 pixels per second.
- A rock appears at the top at a random position, size and speed.
- A new rock arrives every 0.8 seconds at first, down to every 0.25 seconds.
- Rocks fall faster over time, up to a base speed of 420 pixels per second.
- Rocks that leave the bottom of the screen are removed.
- The ship's hit area is a little smaller than its picture, so near misses feel fair.
- The score is ten points per second survived.

## State

- `w`, `h`: screen size.
- `rng`: integer state of the seeded random generator.
- `player`: `{ x, y, r, speed }`.
- `rocks`: list of `{ x, y, r, vy }`.
- `score`, `time`, `spawnIn`.
- `ticks`: bot actions taken so far.
- `over`: true once the run has ended.

## Actions

`"left"`, `"right"` and `"stay"`. Each action plays one tick of 1/30 of a second.

## Step rules

`step(state, action)` moves the ship towards the chosen edge, or keeps it still, then advances the rocks by one tick. The reward is the score gained in that tick. A bot run also ends after 2000 ticks, so bots cannot play forever. People use `advance(state, dt, targetX)`, which has no such limit.

## Score

`score(state)` returns `state.score`.
