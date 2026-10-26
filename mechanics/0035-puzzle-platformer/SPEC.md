# 0035 - Puzzle Platformer ("Portal Shift")

## Concept & Theme
A precision puzzle platformer where a diminutive robotics engineer navigates test chambers filled with weighted alloy crates, floor pressure switches, and magnetic security barriers. Solving each chamber requires pushing crates into pits, leaping across ledges, and activating conduits to reach the exit portal.

## Data-Driven Levels
This mechanic implements `levels: "data"` as defined in `docs/LEVELS.md`.
- `levels.json`: Contains curated puzzle stages with `par` and optimal `solution` moves string.
- `solver.js`: Exports `{ validateLevel, solve, replay }` using a breadth-first search (BFS) shortest-path explorer.
- Actions:
  - `L`: Move left (pushes crate left if open).
  - `R`: Move right (pushes crate right if open).
  - `J`: Jump left (leaps up 1 and left 1 onto ledges or over obstacles).
  - `K`: Jump right (leaps up 1 and right 1 onto ledges or over obstacles).

## Tile Legend
- `#`: Indestructible steel wall / ground.
- `.`: Open air.
- `@`: Engineer starting position.
- `$`: Pushable alloy crate (affected by gravity).
- `_`: Floor pressure plate (must be pressed by crate or player to open doors).
- `D`: Magnetic barrier door (solid when switch is open; passable when switch is active).
- `!`: Quantum exit portal.

## Bot Contract
Exports deterministic functions:
- `createState(seed, options)`: Creates initial state for specified level or seeded random generation.
- `legalActions(state)`: Returns legal movement and jump actions.
- `step(state, action)`: Mutates state in place, executes player movement and crate physics, and returns `{ reward, done }`.
- `isOver(state)`: Returns true when the exit portal is reached or max steps exceeded.
- `score(state)`: Returns numeric score calculated from par efficiency and level completions.
