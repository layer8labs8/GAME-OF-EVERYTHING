# 0124-traditional-roguelike: Rogue's Descent

Classic turn-based grid roguelike, adhering strictly to Berlin Interpretation tenets: permadeath, grid-based turn synchronization, hunger management, dynamic line-of-sight field of view, unidentified magical potions and scrolls, and the quest for the Amulet of Yendor.

## Tenets & Mechanics
- **Grid & Turn Synchronization**: 10x10 tile dungeon map. Every player action advances the world clock by 1 turn, triggering monster reactions.
- **Hunger Clock**: Satiation meter (0 to 100). Decreases by 1 every 2 turns. If satiation reaches 0, player enters Starvation mode, taking 2 HP damage per turn until fed.
- **Field of View (FOV)**: Radius-4 line-of-sight with raycasting. Tiles are either Unexplored (hidden), Visible (in direct line-of-sight), or Remembered (previously explored, but obscured in fog-of-war).
- **Unidentified Magic**:
  - Potions (Crimson, Azure, Emerald). When quaffed, the potion's magical property (Healing, Fortitude, or Toxicity) is permanently identified for the remainder of the run.
  - Scrolls (Parchment, Vellum, Papyrus). Reading casts Magic Mapping, Teleportation, or Firestorm, and identifies the scroll type.
- **Procedural Floors**: 3 subterranean floors connected by staircases (`>`).
  - Floor 1: Vermin Warrens (Giant Rats, Goblins, Food Rations).
  - Floor 2: The Crypts (Skeleton Archers, Orc Marauders, Scrolls & Potions).
  - Floor 3: Sanctum of Yendor (The Dread Chimera guarding the Amulet of Yendor).
- **Bump Combat**: Moving into an enemy tile automatically executes a melee strike with attacker damage = `Math.max(1, atk - def)`.

## State Schema
- `seed`: integer PRNG seed
- `rngState`: current PRNG state
- `floor`: integer (1 to 3)
- `maxFloors`: 3
- `turns`: integer (0 to 300)
- `maxTurns`: 300
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `hasAmulet`: boolean
- `identified`: object `{ potions: { crimson, azure, emerald }, scrolls: { parchment, vellum, papyrus } }`
- `player`:
  - `x`: integer (0 to 9)
  - `y`: integer (0 to 9)
  - `hp`: integer (0 to 60)
  - `maxHp`: integer (60)
  - `atk`: integer (10)
  - `def`: integer (3)
  - `hunger`: integer (0 to 100)
  - `inventory`: array of item objects (max 6 items)
- `map`: 10x10 array of characters (`#` wall, `.` floor, `>` stairs, `A` amulet)
- `visible`: 10x10 array of booleans (current FOV)
- `explored`: 10x10 array of booleans (fog memory)
- `enemies`: array of active enemy objects `{ id, name, type, x, y, hp, maxHp, atk, def }`
- `items`: array of ground item objects `{ id, type, name, color, x, y }`
- `combatLog`: array of strings

## Actions
- `move:up`, `move:down`, `move:left`, `move:right`: Move into adjacent walkable cell or bump-attack enemy.
- `wait`: Rest 1 turn to regenerate 1 HP (if satiated > 30) while monsters act.
- `descend`: Descend to next floor when standing on staircase `>`.
- `pickup`: Pick up ground item on player tile into inventory.
- `quaff:<inventory_index>`: Quaff potion from inventory (heals, buffs, or poisons; identifies potion).
- `read:<inventory_index>`: Read scroll from inventory (magic mapping, teleport, or firestorm; identifies scroll).
- `eat:<inventory_index>`: Consume food ration from inventory (+40 hunger satiation).

## Scoring & Termination
- **Victory**: Defeating the Chimera on Floor 3, claiming the Amulet of Yendor, and standing on the sanctum exit or picking up the Amulet. Reward: `1.0`.
- **Defeat**: Player HP drops to 0 (combat damage or starvation) or `turns >= maxTurns`. Reward: `0.0`.
- **Score**: `(victory ? 2500 : 0) + floor * 300 + kills * 50 + (hasAmulet ? 1000 : 0) + player.hp * 5`.
