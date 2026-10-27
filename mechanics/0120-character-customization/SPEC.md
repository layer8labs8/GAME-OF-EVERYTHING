# 0120-character-customization: Avatar of Destiny

A deep character creation and customization roleplaying system featuring freeform attribute allocation (STR, DEX, INT, CON), background origins, fighting styles, cosmetic gear stylings, and a four-stage destiny trial gauntlet.

## Overview

In **Avatar of Destiny**, players sculpt their ideal hero archetype from the ground up by distributing attribute points, selecting origin heritage traits, choosing weapon disciplines, and testing their customized build across an escalating gauntlet culminating in the Mirror Doppelgänger. Attributes synergize directly with combat efficacy: Strength powers crushing melee blows, Dexterity unlocks swift criticals and dodges, Intelligence governs arcane spell damage, and Constitution dictates vital health pools.

## Core Mechanics

- **Attribute Point Distribution (15 Starting Points)**:
  - `Strength (STR)`: +2.5 Physical Attack, +1 Armor Defense per point.
  - `Dexterity (DEX)`: +1.5% Critical Strike chance, +1.2% Dodge evasion per point.
  - `Intelligence (INT)`: +5 Max MP, +3.5 Arcane Spell Power per point.
  - `Constitution (CON)`: +12 Maximum HP, +2 Potion efficacy per point.
- **Origin Background Traits**:
  - `Ironborn`: +4 STR, +20 HP, innate physical damage resistance.
  - `Shadowblade`: +4 DEX, +10% Critical strike chance, bonus backstab execute.
  - `Spellweaver`: +4 INT, +25 MP, innate elemental burst spell.
  - `Guardian`: +4 CON, +3 Defense, shield wall fortification.
- **Weapon Disciplines**:
  - `Greatsword`: High base damage, scaling heavily with Strength.
  - `Dual Daggers`: Multi-hit rapid strikes with Dexterity critical scaling.
  - `Arcane Staff`: Ranged elemental blasts consuming MP, scaling with Intelligence.
- **Trial of Destiny Gauntlet**:
  - Trial 1: Stone Sentinel (Resistant to physical, vulnerable to magic).
  - Trial 2: Phantom Skirmisher (High speed, vulnerable to heavy guard).
  - Trial 3: Abyssal Warlock (Deadly spells, vulnerable to swift interrupts).
  - Trial 4: The Mirror Doppelgänger (Apex encounter reflecting the player's build).
- **Victory & Defeat**:
  - **Victory**: Slay the Mirror Doppelgänger in Trial 4.
  - **Defeat**: Player HP drops to 0, or turns exceed 150.

## Determinism & Bot Interface

- Pure deterministic Bot Contract:
  - `createState(seed)`: Initializes creation pool, traits, trial bosses, and stats.
  - `legalActions(state)`: Returns array of valid commands (`allocate:<stat>`, `choose_trait:<trait>`, `choose_weapon:<weapon>`, `attack`, `spell`, `dodge`, `potion`).
  - `step(state, action)`: Pure state transition returning `{ reward, done }`.
  - `isOver(state)`: Returns boolean indicating mission victory or player defeat.
  - `score(state)`: Metric of performance based on trials conquered, build synergy, and battle efficiency.
