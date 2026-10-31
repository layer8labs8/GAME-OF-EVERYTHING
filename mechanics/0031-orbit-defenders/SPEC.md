# 0031-space-invaders: Orbit Defenders

Classic fixed-shooter arcade recreation with marching alien fleets, destructible defensive bunkers, accelerating march tempo, descending invasion waves, and bonus mystery saucers.

## State
- `player`:
  - `x`: number (horizontal coordinate)
  - `y`: number (580)
  - `lives`: integer (starts at 3)
  - `bullet`: `{ x, y }` | `null` (active player laser)
- `invaders`: array of invader objects:
  - `{ id, row, col, x, y, type: 'squid' | 'crab' | 'octopus', points: number, alive: boolean }`
- `fleet`:
  - `dir`: `1` (right) or `-1` (left)
  - `stepTimer`: integer
  - `stepInterval`: integer (accelerates as invaders decrease)
- `bombs`: array of `{ x, y, vy }` dropped by invaders
- `bunkers`: array of 3 bunkers, each containing 4 destructible segments `{ x, y, w, h, hp }`
- `ufo`: `{ x, y, vx, points }` | `null` (mystery flying saucer)
- `ufoTimer`: integer (countdown to next UFO flyby)
- `bombTimer`: integer (countdown to next alien bomb drop)
- `wave`: integer (starts at 1)
- `score`: integer
- `stepCount`: integer (max 1500)
- `rng`: integer PRNG state

## Actions
- `'left'`: moves laser cannon left
- `'right'`: moves laser cannon right
- `'fire'`: discharges upward laser (if no bullet currently in flight)
- `'wait'`: advances simulation without moving cannon

## Game Over & Scoring
- Game ends when `player.lives <= 0`, any invader reaches `y >= 480` (invasion breach), or `stepCount >= 1500`.
- Score:
  - Octopus: 10 pts
  - Crab: 20 pts
  - Squid: 30 pts
  - Mystery UFO: 100 pts
  - Wave Clear Bonus: +200 pts
