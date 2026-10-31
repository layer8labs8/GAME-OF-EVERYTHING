# 0128-action-adventure: Sunken Spire

Classic top-down action-adventure featuring tool-gated world exploration, environmental puzzles (crystal switches, cracked walls, chasm posts), dungeon keys, and multi-stage boss encounters.

## Core Pillars & Mechanics
- **Tool-Gated Exploration**:
  - **Sword**: Primary melee weapon for close-quarters strikes and grass/barrier slashing.
  - **Boomerang**: Ranged projectile thrown in 4 cardinal directions. Stuns enemies and strikes distant crystal switches (`*`) to lower gates.
  - **Bombs**: Deployable explosives that detonate cracked stone walls (`C`) to reveal hidden chambers.
  - **Hookshot**: Fires across chasms or water gaps to grapple onto wooden posts (`P`), pulling the hero across.
- **Keys & Gated Progression**:
  - Small Keys (`k`) unlock iron doors (`D`).
  - Master Key (`B`) unlocks the Boss Sanctum door (`X`).
- **Environmental Puzzles**:
  - Crystal switches (`*`): Toggles retractable barrier gates (`G` to `.`).
  - Heart Containers (`H`): Permanently increases max HP by 10 and fully heals.
- **Dungeon Wings**:
  - Wing 1: The Sun Courtyard (Find Boomerang & Small Key; hit crystal switch).
  - Wing 2: The Fire Foundry (Defeat Armored Guard, acquire Bombs, blow open the Boss Key sanctum).
  - Wing 3: The Sunken Vault (Hookshot across chasms, unlock Boss Sanctum, defeat Gorgon Titan).

## State Schema
- `seed`: integer PRNG seed
- `rngState`: current PRNG state
- `wing`: integer (1 to 3)
- `maxWings`: 3
- `turns`: integer (0 to 250)
- `maxTurns`: 250
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `player`:
  - `x`: integer (0 to 9)
  - `y`: integer (0 to 9)
  - `hp`: integer (0 to 40)
  - `maxHp`: integer (40)
  - `tools`: array of string IDs (`'sword'`, `'boomerang'`, `'bombs'`, `'hookshot'`)
  - `keys`: integer (0 to 3)
  - `hasMasterKey`: boolean
  - `bombsCount`: integer
- `map`: 10x10 array of characters (`#` wall, `.` floor, `~` water/chasm, `C` cracked wall, `P` hookshot post, `*` switch, `G` barrier gate, `D` locked door, `X` boss door, `k` small key, `B` master key, `H` heart, `R` relic)
- `enemies`: array of monster objects `{ id, name, type, x, y, hp, maxHp, atk, stunned }`
- `combatLog`: array of strings

## Actions
- `move:up`, `move:down`, `move:left`, `move:right`: Move into adjacent walkable cell or bump-attack monster.
- `throw_boomerang:up`, `throw_boomerang:down`, `throw_boomerang:left`, `throw_boomerang:right`: Throws boomerang to stun monsters or trigger switches.
- `place_bomb:up`, `place_bomb:down`, `place_bomb:left`, `place_bomb:right`: Places bomb to detonate cracked wall `C`.
- `hookshot:up`, `hookshot:down`, `hookshot:left`, `hookshot:right`: Fires hookshot at distant post `P` to pull player across chasm.
- `unlock:up`, `unlock:down`, `unlock:left`, `unlock:right`: Uses Small Key to open locked door `D`, or Master Key to open Boss Door `X`.
- `wait`: Rest 1 turn.

## Termination & Scoring
- **Victory**: Slaying the Gorgon Titan and claiming the Solar Relic (`R`) in Wing 3. Reward: `1.0`.
- **Defeat**: Player HP drops to 0 or `turns >= maxTurns`. Reward: `0.0`.
- **Score**: `(victory ? 3000 : 0) + wing * 400 + player.hp * 10 + player.tools.length * 150 + enemiesKilled * 50`.
