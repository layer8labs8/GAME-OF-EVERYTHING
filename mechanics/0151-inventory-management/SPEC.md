# 0151-inventory-management: Grid Hauler

A spatial inventory and backpack management simulation inspired by Backpack Hero and Resident Evil Attache Case. Players assume the role of an expedition Quartermaster, organizing grid slots, optimizing item placement synergies (adjacent mana buffs, weapon orientations), managing weight limits, and outfitting an adventurer to conquer dungeon chambers.

## Core Pillars & Mechanics

- **Spatial Backpack Grid**:
  - Starts as a 4x4 grid (16 slots), expandable up to 5x5 (25 slots).
  - Items possess distinct dimensional sizes, weights, and stat bonuses:
    - `Health Potion` (1x1, 1 kg, +15 HP when used)
    - `Runic Dagger` (1x2, 2 kg, +12 ATK; +6 bonus if adjacent to Mana Gem)
    - `Iron Kite Shield` (2x2, 4 kg, +18 DEF)
    - `Mana Shard` (1x1, 1 kg, +8 Magic; buffs adjacent items)
    - `Trail Rations` (1x1, 1 kg, +10 Stamina; consumed during chamber delves)
- **Delve Encounters & Quartermaster Directives**:
  - `action:pack_potion`: Fits a Health Potion into available backpack slots.
  - `action:pack_dagger`: Fits a Runic Dagger into available backpack slots.
  - `action:pack_shield`: Fits an Iron Kite Shield into available backpack slots.
  - `action:pack_mana`: Fits a Mana Shard into available backpack slots.
  - `action:pack_rations`: Fits Trail Rations into available backpack slots.
  - `action:expand_grid`: Expands backpack storage slots ($200).
  - `action:upgrade_straps`: Increases max carry weight capacity ($150).
  - `action:delve_encounter`: Deploys adventurer into chamber encounter, evaluating gear stats against monster threat, earning dungeon gold and relics.
- **Victory & Defeat**:
  - Victory: Conquer 8 dungeon chambers and accumulate >= $2,000 in dungeon gold.
  - Defeat: Adventurer HP reaches 0 due to unprepared encounters, or gold drops below -$200.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `chamber`: integer (encounter depth)
- `gold`: integer (starting $300)
- `adventurerHp`: integer (starting 100)
- `gridRows`: integer (starting 4)
- `gridCols`: integer (starting 4)
- `maxWeight`: integer (starting 18)
- `items`: array of placed item objects { id, type, row, col, w, h, weight, atk, def }
- `chambersCleared`: integer
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized inventory state.
- `legalActions(state)`: Returns non-empty list of available packing and expedition directives.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean simulation completion flag.
- `score(state)`: Evaluates inventory management score.
