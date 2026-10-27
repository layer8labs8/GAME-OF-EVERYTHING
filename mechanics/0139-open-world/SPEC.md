# 0139-open-world: Wilds of Eldoria

An open-world adventure inspired by The Legend of Zelda: Breath of the Wild and Skyrim. Players explore a non-linear realm (Highland Plateau, Whispering Forest, Arid Canyon, Storm Peaks), activating regional towers, solving ancient Shrines of Light, forging restorative meals, pulling the legendary Sunforged Blade, and vanquishing Zephyros the Storm Sovereign.

## Core Pillars & Mechanics

- **Non-Linear Open World Regions**:
  - `highland_plateau`: The elevated starting sanctuary containing the Temple of Time.
  - `whispering_forest`: Dense woodlands concealing the Lost Woods and the Sunforged Blade pedestal.
  - `arid_canyon`: Sun-bleached crags populated by bandit camps, copper ore, and Sheikah tech ruins.
  - `storm_peaks`: Sub-zero mountain peaks guarded by the final apex boss, Zephyros the Storm Sovereign.
- **Open-World Systems**:
  - `activate_tower:<region>`: Synchronizes map markers and unlocks regional fast travel.
  - `explore_shrine:<id>`: Completes ancient Sheikah trials, granting Spirit Orbs.
  - `upgrade:health` / `upgrade:stamina`: Offers 4 Spirit Orbs at the Temple of Time for permanent upgrades.
  - `forage_gather` & `cook_meal`: Harvest wild flora/fauna and cook restorative stews with spicy cold resistance.
  - `draw_blade`: Requires at least 140 Max HP to survive the divine trial and wield the Sunforged Blade.
  - `challenge_boss`: Confronts Zephyros in epic combat (strike, bow shot, shield parry, food heal).
- **Victory & Defeat**:
  - Victory: Vanquish Zephyros the Storm Sovereign at Storm Peaks.
  - Defeat: Player HP reduced to 0.
  - Bounded: Finite termination guaranteed at 150 turns.

## State Schema
- `seed`: integer
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `region`: string ('plateau' | 'forest' | 'canyon' | 'peaks')
- `hp`, `maxHp`: integers (starting 100/100)
- `stamina`, `maxStamina`: integers (starting 100/100)
- `spiritOrbs`: integer
- `food`: integer
- `hasColdElixir`: boolean
- `towers`: object tracking unlocked regional towers
- `shrinesCleared`: object tracking solved shrines
- `weaponTier`: integer (0 = Tree Branch, 1 = Soldier Broadsword, 2 = Sunforged Blade)
- `hasSunforgedBlade`: boolean
- `boss`: null or object { name, hp, maxHp, atk }
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized open world state.
- `legalActions(state)`: Returns non-empty list of available travel, exploration, cooking, trial, and combat actions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns game completion flag.
- `score(state)`: Evaluates open-world achievement score.
