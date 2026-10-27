# 0126-permadeath: Iron Soul

High-stakes hardcore permadeath dungeon gauntlet where mortality is absolute, consequences are permanent, and players navigate lethal traps, resource scarcity, and the ultimate dilemma: Retire safely to the Hall of Ancestors, or risk everything by delving deeper into the Mortal Crucible.

## Mechanics
- **Absolute Permadeath**: Zero checkpoints, zero second chances. Dying permanently ends the run and carves a tombstone epitaph into the Ancestral Ledger.
- **Trap Detection & Disarming**: Corridors contain telegraphed hazard traps (Spike Pits, Dart Triggers, Lava Vents). Stepping onto an active trap inflicts severe direct damage. Players can expend tool kits to `disarm` adjacent traps.
- **Risk vs Reward Extraction**:
  - At every depth staircase, the player can choose to `retire` (cash out all accumulated treasures safely with a 1.5x Survivor bonus) OR `descend` into deeper, more deadly chambers for exponentially higher spoils.
- **Resource Scarcity**:
  - Emergency Elixirs: Only 2 Life Elixirs per entire run.
  - Toolkit: 3 Disarm Kits.
- **The 4 Depths of Mortals**:
  - Depth 1: The Catacombs (Spike pits, Dart traps, Skeleton Wardens).
  - Depth 2: The Magma Fissure (Fire vents, Lava pools, Cinder Hounds).
  - Depth 3: The Abyssal Void (Void rifts, Phantom Stalkers).
  - Depth 4: The Crucible of Fate (The Grim Harvester guarding the Eternal Sigil).

## State Schema
- `seed`: integer PRNG seed
- `rngState`: current PRNG state
- `depth`: integer (1 to 4)
- `maxDepths`: 4
- `turns`: integer (0 to 250)
- `maxTurns`: 250
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `retired`: boolean
- `causeOfDeath`: string
- `player`:
  - `x`: integer (0 to 9)
  - `y`: integer (0 to 9)
  - `hp`: integer (0 to 50)
  - `maxHp`: integer (50)
  - `elixirs`: integer (0 to 2)
  - `toolkits`: integer (0 to 3)
  - `gold`: integer
- `map`: 10x10 array of characters (`#` wall, `.` floor, `>` stairs, `T` active trap, `t` disarmed trap, `S` sigil)
- `enemies`: array of monster objects `{ id, name, type, x, y, hp, maxHp, atk, def }`
- `combatLog`: array of strings

## Actions
- `move:up`, `move:down`, `move:left`, `move:right`: Move into adjacent walkable cell, trigger trap if stepped on, or bump-attack monster.
- `disarm:up`, `disarm:down`, `disarm:left`, `disarm:right`: Disarm adjacent active trap `T` into inactive `t` using 1 toolkit.
- `quaff`: Consume 1 emergency elixir to restore 25 HP.
- `wait`: Pass turn and observe monster reactions.
- `descend`: Take stairs `>` down to the next lethal depth.
- `retire`: Safely extract at stairs `>` to lock in survivor legacy bonus.

## Termination & Scoring
- **Victory**: Defeating the Grim Harvester at Depth 4 and retrieving the Eternal Sigil, or retiring safely at any depth. Reward: `1.0`.
- **Defeat**: Player HP drops to 0 (combat damage or trap lethality) or `turns >= maxTurns`. Permanent deletion of the run. Reward: `0.0`.
- **Score**: `(victory ? 3000 : 0) + (retired ? 1500 : 0) + depth * 400 + player.gold * 3 + player.hp * 10`.
