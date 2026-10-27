# 0044 - Logic Puzzle ("Circuit Relay")

## Concept & Theme
A cybernetic circuit grid deduction puzzle inspired by classical Lights Out and boolean network relays. Engineers reconfigure corrupted power nodes in a superconducting mainframe matrix. Toggling a node inverts its quantum state and pulses energy along connected conduit traces to invert all orthogonally adjacent relays.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Generates a solvable 3x3 power grid from seeded inversion pulses.
- `legalActions(state)`: Returns all toggle actions for each matrix node (`toggle_0`..`toggle_8`).
- `step(state, action)`: Mutates state in place, inverts target node and its orthogonal neighbors, updates score and parity metrics, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if all circuit relays are fully energized (`1`), or max step limit reached.
- `score(state)`: Returns score based on energization progress and par efficiency.

## Level Contract (levels = "data")
Implements `docs/LEVELS.md` with:
- `solver.js` exporting `{ validateLevel, solve, replay }`.
- `levels.json` holding curated puzzles with verified optimal par and shortest solution strings.
- Moves represented by lowercase letters `'a'` to `'y'` corresponding to grid indices `0` to `24`.

## Victory & Defeat
- **Victory**: All circuit relays energized to active state `1`.
- **Defeat**: Exceeded maximum allowed toggles (par threshold or 60 steps).
