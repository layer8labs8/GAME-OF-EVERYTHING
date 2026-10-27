# 0131-interactive-fiction: Colossal Vault

Classic Infocom/Zork-style text-driven Interactive Fiction featuring compass navigation, world state object manipulation, brass lantern dark room illumination (avoiding grue hazards), and the quest to recover 3 legendary treasures for the Trophy Case.

## Core Pillars & Mechanics
- **Compass Navigation**:
  - `north`, `south`, `east`, `west`, `up`, `down` across an interconnected spatial world graph.
- **Parser & Object State Machine**:
  - `examine:<target>`: Read inscriptions, inspect hidden compartments.
  - `take:<item>` / `drop:<item>`: Inventory weight and item retrieval.
  - `open:<container>` / `unlock:<target>:with:<item>`: Lock-and-key interactions.
  - `light:<item>`: Igniting the Brass Lantern to illuminate subterranean dark zones.
- **Grue & Darkness Mechanics**:
  - Subterranean caves are pitch black. Entering without a lit lantern triggers warning; staying without light results in being eaten by a grue (death).
- **Locations**:
  - **Cottage Clearing**: Wooden Mailbox, Front Door, Welcome Mat (hides Skeleton Key).
  - **Living Room**: Trophy Case, Persian Rug, Trapdoor down to Cellar.
  - **Whispering Forest**: Ancient Oak (climb up to bird nest holding Jeweled Egg).
  - **Subterranean Cavern**: Pitch black abyss, requires Brass Lantern. Holds Platinum Ingot.
  - **Ancient Shrine**: Golden Chalice of Ages.
- **Victory Condition**:
  - Deposit all 3 Treasures (Jeweled Egg, Platinum Ingot, Golden Chalice) into the Trophy Case in the Living Room.

## State Schema
- `seed`: integer PRNG seed
- `currentLocation`: string
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `inventory`: array of item IDs
- `lanternLit`: boolean
- `treasuresDeposited`: integer (0 to 3)
- `world`:
  - `mailbox_open`: boolean
  - `mat_moved`: boolean
  - `front_door_locked`: boolean
  - `trapdoor_open`: boolean
  - `trophy_case_treasures`: array of string IDs
  - `itemsAt`: object mapping location IDs to arrays of item IDs
- `combatLog`: array of strings

## Actions
- `go:north`, `go:south`, `go:east`, `go:west`, `go:up`, `go:down`
- `examine:<target>`
- `take:<item>`
- `drop:<item>`
- `open:<target>`
- `move:<target>` (e.g. `move:mat`)
- `unlock:<target>`
- `light:lantern`
- `deposit:<item>` (in Living Room trophy case)
- `wait`

## Termination & Scoring
- **Victory**: All 3 treasures deposited into the Trophy Case. Reward: `1.0`.
- **Defeat**: Eaten by a grue in the dark or exceeding 150 turns. Reward: `0.0`.
- **Score**: `(victory ? 3000 : 0) + treasuresDeposited * 500 + inventory.length * 100 + Math.max(0, 150 - turns) * 5`.
