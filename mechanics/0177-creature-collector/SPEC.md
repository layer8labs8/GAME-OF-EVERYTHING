# 0177-creature-collector: Beast Tamer Arena

A turn-based creature collection and arena battler inspired by *Pokemon* and classic monster tamers. Players explore tall grass biomes to encounter, weaken, and capture elemental beasts using Tamer Spheres, level up their party roster through strategic combat, exploit elemental type advantages (Fire, Water, Grass, Electric), and defeat 3 regional Arena Leaders before conquering the Grand Champion dragon *Solarchon*.

## Core Pillars & Mechanics

- **Elemental Types & Weaknesses**:
  - `Fire`: Strong against Grass (x1.5), weak against Water (x0.7).
  - `Water`: Strong against Fire (x1.5), weak against Electric (x0.7).
  - `Grass`: Strong against Water (x1.5), weak against Fire (x0.7).
  - `Electric`: Strong against Water (x1.5), neutral to others.
- **Party & Beast Stats**:
  - Active beast has `species`, `element`, `hp`, `maxHp`, `attack`, `defense`, `level`, and `exp`.
  - Player carries up to 3 beasts in their party.
  - Leveling up increases `maxHp`, `attack`, and `defense`.
- **Tamer Resources**:
  - `spheres`: Tamer Spheres to capture wild creatures (starts at 5). Capture rate increases drastically as wild beast HP is depleted.
  - `potions`: Healing elixirs restoring +40 HP to active beast (starts at 3).
  - `badges`: Earned by defeating Arena Leaders (0 to 3).
- **Combat & Exploration Actions**:
  - `action:explore_tall_grass`: Scours the wild to encounter wild elemental beasts.
  - `action:throw_tamer_sphere`: Throws a sphere to capture the wild creature if party has space (< 3) or replaces bench.
  - `action:command_attack`: Strikes the enemy with an elemental offensive move.
  - `action:command_defend`: Fortifies stance, cutting incoming enemy damage by 50%.
  - `action:use_potion`: Heals active beast by +40 HP.
  - `action:switch_beast:<index>`: Swaps active creature with a healthy party member.
  - `action:challenge_arena_leader`: Initiates an official badge match against the current tier Leader.
- **Victory & Defeat**:
  - Victory: Defeat Grand Champion *Solarchon* in the Master Arena.
  - Defeat: All party creatures faint (0 HP) with no potions remaining, or turns reach maxTurns (120).

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-120)
- `maxTurns`: 120
- `party`: array of beast objects
- `activeBeastIndex`: integer (0-2)
- `enemy`: beast object or null
- `inBattle`: boolean
- `isArenaMatch`: boolean
- `badges`: integer (0-3)
- `spheres`: integer (starts at 5)
- `potions`: integer (starts at 3)
- `creaturesCaught`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
