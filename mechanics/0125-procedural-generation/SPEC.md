# 0125-procedural-generation: Genesis Engine

Interactive procedural generation roguelike where dungeon topology is generated on-the-fly using classic procedural generation algorithms (Binary Space Partitioning, Cellular Automata caves, and Drunkard Walk catacombs), and players wield topological modifiers (Erosion, Solidification, Resonance Pulse) to alter procedural layouts in real time.

## Algorithms & Sectors
- **Sector 1 (BSP Dungeons)**: Geometric rectangular rooms linked by rectilinear L-corridors using Binary Space Partitioning.
- **Sector 2 (Cellular Caves)**: Organic cavernous tunnels carved via cellular automata rules (Moore neighborhood smoothing).
- **Sector 3 (Drunkard Catacombs)**: Meandering, dense interconnected tunnels generated via random walk excavations.
- **Sector 4 (The Genesis Core)**: Hybrid algorithmic maze guarding the central Singularity Core.

## Topological Tools (Catalysts)
- **Erode**: Dissolves adjacent wall cells into traversable floor paths (costs 10 Flux).
- **Solidify**: Constructs defensive stone barriers on adjacent empty cells (costs 10 Flux).
- **Resonance Pulse**: Reveals map topology and detects hidden artifacts and anomalies in a wide radius (costs 5 Flux).

## State Schema
- `seed`: integer PRNG seed
- `rngState`: current PRNG state
- `sector`: integer (1 to 4)
- `maxSectors`: 4
- `turns`: integer (0 to 250)
- `maxTurns`: 250
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `player`:
  - `x`: integer (0 to 9)
  - `y`: integer (0 to 9)
  - `hp`: integer (0 to 60)
  - `maxHp`: integer (60)
  - `flux`: integer (0 to 100)
  - `maxFlux`: integer (100)
  - `keystones`: integer (0 to 3)
- `map`: 10x10 array of characters (`#` wall, `.` floor, `E` exit portal, `K` keystone, `F` flux node)
- `visible`: 10x10 array of booleans
- `explored`: 10x10 array of booleans
- `enemies`: array of anomaly objects `{ id, name, type, x, y, hp, maxHp, atk }`
- `combatLog`: array of strings

## Actions
- `move:up`, `move:down`, `move:left`, `move:right`: Move into adjacent walkable cell or bump-attack anomaly.
- `erode:up`, `erode:down`, `erode:left`, `erode:right`: Erode adjacent wall into floor.
- `solidify:up`, `solidify:down`, `solidify:left`, `solidify:right`: Place wall on adjacent floor tile.
- `pulse`: Cast Resonance Pulse to reveal surrounding 5x5 grid and gain sight.
- `wait`: Pass turn, recover 5 Flux.
- `activate`: Step into Exit Portal `E` to transition to next procedural sector.

## Termination & Scoring
- **Victory**: Stabilizing the Genesis Engine in Sector 4 with all 3 Keystones collected. Reward: `1.0`.
- **Defeat**: Player HP reduced to 0 or `turns >= maxTurns`. Reward: `0.0`.
- **Score**: `(victory ? 3000 : 0) + sector * 350 + keystones * 400 + player.flux * 2 + player.hp * 5`.
