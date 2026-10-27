# 0132-text-based: Kingdom of Text

A classic text-based fantasy RPG inspired by early MUDs, SanctuaryRPG, and Kingdom of Loathing. Players manage character stats, navigate narrative realms (Town of Oakhaven, Darkwood Forest, Shadow Crypt, Wyrm Peak), engage in tactical turn-based text combat, acquire gear upgrades, brew potions, and conquer the Ancient Wyrm to save the realm.

## Core Mechanics

- **Narrative Realms & Exploration**:
  - `Town of Oakhaven`: Safe sanctuary featuring the Starlight Tavern, Iron Forge Blacksmith, and Herbalist.
  - `Darkwood Forest`: Sylvan wilderness populated by Dire Wolves and Forest Bandits, concealing the Shrine of Dawn.
  - `Shadow Crypt`: Subterranean necropolis guarding the Necromancer and the Ancient Relic.
  - `Wyrm Peak`: Mountain peak where the climatic boss, Ignis the Dread, dwells. Accessible once the hero reaches Level 3 or obtains the Ancient Relic.
- **Attributes & Progression**:
  - `hp` / `maxHp` (Starting: 100/100)
  - `mana` / `maxMana` (Starting: 40/40)
  - `level` (1 to 5) and `xp` (100 per level)
  - `gold` (accumulated through combat and chests)
  - Equipment tiers:
    - Weapon: Rusty Blade (+4 ATK) -> Steel Longsword (+10 ATK) -> Sunfire Claymore (+20 ATK)
    - Armor: Padded Tunic (+2 DEF) -> Chainmail Hauberk (+6 DEF) -> Dragon Scale Cuirass (+14 DEF)
- **Turn-Based Tactical Text Combat**:
  - `combat:strike`: Basic physical strike scaled by weapon attack and strength.
  - `combat:cast_fireball`: High elemental burst damage costing 15 Mana.
  - `combat:heal_spell`: Restores 35 HP costing 15 Mana.
  - `combat:defend`: Enters defensive posture, mitigating 60% incoming damage and restoring 10 Mana.
  - `combat:drink_potion`: Restores 50 HP immediately (consumes 1 potion).
  - `combat:flee`: Tactical escape back to Oakhaven with slight stamina/reward penalty.
- **Town & Sanctuary Economy**:
  - `town:rest`: Sleep at the Tavern, restoring full HP and Mana for 10 Gold.
  - `town:buy_weapon`: Forge superior weapon upgrades.
  - `town:buy_armor`: Reinforce defense with premium armor.
  - `town:buy_potion`: Purchase healing draughts for 15 Gold.
- **Victory & Defeat**:
  - Victory: Slay the legendary Ancient Wyrm at Wyrm Peak.
  - Defeat: Player HP drops to 0.
  - Finite Termination: Caps at 150 turns.

## State Schema
- `seed`: integer
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `location`: string ('town' | 'darkwood' | 'crypt' | 'wyrm_peak')
- `player`:
  - `hp`, `maxHp`: integers
  - `mana`, `maxMana`: integers
  - `level`, `xp`: integers
  - `gold`: integer
  - `potions`: integer
  - `weapon`: string
  - `weaponAtk`: integer
  - `armor`: string
  - `armorDef`: integer
  - `hasRelic`: boolean
- `enemy`: null or object { id, name, hp, maxHp, atk, def, goldReward, xpReward, isBoss }
- `defending`: boolean
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings (narrative text log)
- `eventsResolved`: object tracking one-time shrines and chests

## Pure Bot Contract
- `createState(seed)`: Initializes deterministic world state.
- `legalActions(state)`: Returns non-empty list of available textual commands.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean game over status.
- `score(state)`: Returns integer score based on progression, defeated foes, gold, and victory.
