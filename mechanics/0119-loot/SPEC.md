# 0119-loot: Vault Hunter: Abyssal Relics

A Diablo-inspired loot-driven action RPG featuring procedural weapon/armor drops across 4 rarity tiers (Common, Rare, Epic, Legendary), item prefix/suffix affixes, equipment salvage and blacksmith upgrading, and vault guardian boss encounters.

## Overview

In **Vault Hunter: Abyssal Relics**, the adventurer delves through 5 increasingly perilous vault chambers in search of god-tier equipment. Defeating vault sentinels triggers rich loot explosions featuring weapons, armor, and relics rolled across distinct rarity tiers with synergistic combat modifiers. Players optimize their loadout between battles by equipping superior gear, salvaging vendor trash for scrap, and forging enhancements before confronting the Vault Sovereign.

## Core Mechanics

- **Procedural Loot Rarity**:
  - **Common** (Gray): Baseline offensive/defensive values.
  - **Rare** (Blue): +25% stats + 1 affix (+Crit Chance or +Life Steal).
  - **Epic** (Purple): +50% stats + 2 affixes (+Thorns, +Elemental Burst).
  - **Legendary** (Gold): +100% stats + unique passive trait (*Infernal Cleave* or *Divine Ward*).
- **Equipment Slots**:
  - `Weapon`: Primary attack power and crit damage.
  - `Armor`: Damage reduction defense and maximum HP boost.
  - `Relic`: Special modifiers (Life on hit, damage reflect, MP regeneration).
- **Blacksmith & Inventory**:
  - `equip:<slot>`: Equips item from backpack (swapping out current gear).
  - `salvage:<slot>`: Dismantles unneeded loot into Gold/Scrap.
  - `upgrade:<gearSlot>`: Enhances equipped item (+1 upgrade tier using gathered scrap).
- **5 Vault Gauntlet**:
  - Vault 1: Scavenger Pack (Scrappy Daggers, Padded Vests).
  - Vault 2: Ironclad Sentinels (Heavy Claymores, Plate Mail).
  - Vault 3: Nether Fiends (Cursed Blades, Shadow Garb).
  - Vault 4: Chaos Behemoth (Doomhammers, Dragon Scales).
  - Vault 5: The Vault Sovereign (Apex Encounter guarding the Prismatic Relic).
- **Victory & Defeat**:
  - **Victory**: Slay the Vault Sovereign in Vault 5 and secure the Prismatic Relic.
  - **Defeat**: Player HP drops to 0, or turns exceed 150.

## Determinism & Bot Interface

- Pure deterministic Bot Contract:
  - `createState(seed)`: Procedurally seeds vault monsters, starting loadout, and deterministic loot rolls.
  - `legalActions(state)`: Returns array of valid commands (`attack`, `skill`, `heal`, `equip:<idx>`, `salvage:<idx>`, `upgrade:<slot>`, `next_vault`).
  - `step(state, action)`: Pure functional state transition returning `{ reward, done }`.
  - `isOver(state)`: Returns boolean indicating mission victory or defeat.
  - `score(state)`: Metric of performance based on vaults cleared, gold/scrap acquired, item quality equipped, and damage dealt.
