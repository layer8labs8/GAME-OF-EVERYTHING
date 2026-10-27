# 0108-lane-defense: Lane Bastion

A tactical multi-lane tower defense and creep mitigation strategy game. The player fortifies three distinct battlefield lanes (Top, Mid, Bottom) against advancing waves of monstrous invaders, deploying archer towers, cannon bastions, barricades, and a mobile frontline Champion Hero.

## Core Rules & Features
- **Battlefield Architecture**:
  - 3 parallel lanes: Lane 0 (Top), Lane 1 (Mid), Lane 2 (Bot).
  - Lane length: 8 sectors (`x: 0..7`).
  - Player Fortress Gate at `x: 0` (Citadel HP: 30).
  - Enemy Incursion Rift at `x: 7`.
  - Buildable sectors on each lane: `x: 1, 2, 3, 4`.
- **Defensive Installations**:
  - `archer`: Cost 25 Gold. Long-range rapid ballistics (Range 4, 8 DMG/turn).
  - `cannon`: Cost 40 Gold. Heavy artillery (Range 3, 16 DMG to front target).
  - `barricade`: Cost 15 Gold. Reinforced obstruction (45 HP) that halts advancing creeps until breached.
  - `obelisk`: Cost 35 Gold. Arcane spire that chills enemy movement and inflicts 10 piercing DMG.
- **Champion Hero**:
  - `hero_deploy:{lane}`: Moves the mobile Fortress Champion to a specific lane. The Champion duels the nearest creep, dealing 12 DMG each turn and soaking up to 35 HP before resting.
- **Creep Host & Wave Progression**:
  - Goblin Sprinters (14 HP, speed 2, bounty 6 gold).
  - Orc Brutes (32 HP, speed 1, bounty 12 gold).
  - Siege Ogres (60 HP, speed 1, high breach damage, bounty 24 gold).
  - 6 planned hostile waves arriving every 4 turns. Total simulation bounded by `MAX_TURNS = 36`.
- **Termination & Score**:
  - **Victory**: Successfully repel all 6 waves with zero surviving enemy invaders.
  - **Defeat**: Fortress Gate HP reduced to 0 by encroaching invaders.
  - **Score**: Sunk enemy creeps, remaining Fortress HP, gold reserve efficiency, and active towers.
- **Bot Contract**:
  - `createState(seed)`: Initializes deterministic waves, lane grids, starting 60 Gold, and full 30 Gate HP.
  - `legalActions(state)`: Returns valid construction, tower upgrades, hero positioning, and wave advancement.
  - `step(state, action)`: Applies defensive orders, computes projectile ballistics, returns `{ reward, done }`.
  - `isOver(state)`: Returns boolean terminal state.
  - `score(state)`: Evaluates defensive efficacy.
