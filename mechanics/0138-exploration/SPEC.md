# 0138-exploration: Abyssal Horizons

An oceanic deep-sea exploration adventure. Players pilot an advanced submersible across an uncharted 6x6 oceanic grid shrouded in deep-sea fog of war, managing battery energy, surveying alien biomes and hydrothermal vents, and cataloguing the Primordial Monolith buried in the abyssal trench.

## Core Pillars & Mechanics

- **Fog of War & Ocean Grid**:
  - A 6x6 oceanic sector grid (36 coordinates).
  - Shrouded in darkness until explored or scanned via active sonar.
- **Submersible Navigation & Resources**:
  - `move:north`, `move:south`, `move:east`, `move:west`: Navigate the grid, uncovering fog of war.
  - `battery` / `maxBattery`: Expended with movements and sensor pings. Recharged by tapping hydrothermal vents.
  - `hull` / `maxHull`: Submersible integrity; damaged by thermal pressure if unprepared.
  - `specimens`: Catalogued flora, geological minerals, and ancient relics.
- **Exploration Toolkit**:
  - `action:sonar_pulse`: Pings sonar to unveil surrounding 3x3 sector terrain and anomalies.
  - `action:survey_specimen`: Samples unique points of interest (Bioluminescent Reef, Sunken Galleon, Abyssal Vent).
  - `action:harness_vent`: Recharges submersible battery using geothermal vents.
  - `action:activate_monolith`: Unlocks the Primordial Monolith once sufficient sector coverage is mapped.
- **Victory & Defeat**:
  - Victory: Successfully locate and survey the Primordial Monolith with at least 15 charted sectors.
  - Defeat: Battery fully depleted or hull compromised.
  - Finite Termination: 150 turns max.

## State Schema
- `seed`: integer
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `x`, `y`: integers (0 to 5)
- `battery`, `maxBattery`: integers
- `hull`, `maxHull`: integers
- `charted`: object mapping "x,y" to boolean
- `surveyed`: object mapping "x,y" to boolean
- `specimensCount`: integer
- `grid`: 6x6 2D array of sector descriptors (empty, vent, reef, galleon, monolith)
- `monolithPos`: object { x, y }
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized submersible exploration state.
- `legalActions(state)`: Returns available navigational, scanning, surveying, and recharging actions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns exploration completion flag.
- `score(state)`: Evaluates exploration and cartographic score.
