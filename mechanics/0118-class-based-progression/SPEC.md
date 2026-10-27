# 0118-class-based-progression: Trials of Mastery: Ascendant Classes

A deep roleplaying progression system centered around class branching, job mastery skill trees, cross-class talent passives, and multi-tier specialization gauntlets.

## Overview

In **Trials of Mastery**, the hero begins as an unspecialized Novice and ascends through a branching multi-tier class tree (Warrior, Rogue, Mage -> Paladin, Assassin, Archmage) by conquering an escalating gauntlet of arena trials. Defeating adversaries yields Experience Points (XP) and Job Points (JP), enabling players to unlock active battle arts, passive multipliers, and switch between unlocked specializations to counter diverse boss resistances.

## Core Mechanics

- **Branching Class Tree**:
  - **Tier 0**: `Novice` (Balanced starter with Basic Strike and First Aid).
  - **Tier 1 Specializations** (Unlocked at Level 2):
    - `Warrior`: High HP & defense, Shield Wall, Cleave.
    - `Rogue`: High crit and speed, Quick Slash, Shadow Veil.
    - `Mage`: Arcane burst, Fireball, Mana Shield.
  - **Tier 2 Ascended Classes** (Unlocked at Level 4):
    - `Paladin` (from Warrior): Holy Smite (bonus holy damage), Divine Aegis.
    - `Assassin` (from Rogue): Death Mark (guaranteed critical execute), Evasion.
    - `Archmage` (from Mage): Cataclysm Meteor, Spell Surge.
- **Skill Tree & Job Points (JP)**:
  - Each victory grants JP to learn active combat arts or passive stat buffs (+Atk, +Def, +MaxHP, +CritChance).
- **Arena Gauntlet**:
  - Trial 1: Training Automaton (Level 1).
  - Trial 2: Orc Marauder (Level 2).
  - Trial 3: Chimera Beast (Level 3).
  - Trial 4: Abyssal Warlock (Level 4).
  - Trial 5: Grand Champion Ignis (Apex Boss).
- **Turn-Based Tactical Battle**:
  - Turn actions: `attack`, `skill:<name>`, `defend`, `potion`, `evolve_class:<class>`, `unlock_skill:<skill>`.
- **Victory & Defeat**:
  - **Victory**: Defeat Grand Champion Ignis in Trial 5.
  - **Defeat**: Player HP drops to 0, or turns exceed 150.

## Determinism & Bot Interface

- Pure deterministic Bot Contract:
  - `createState(seed)`: Initializes hero, progression tree, and trial adversaries.
  - `legalActions(state)`: Returns array of valid commands (`attack`, `skill:<name>`, `defend`, `potion`, `evolve_class:<className>`, `unlock_skill:<skillId>`).
  - `step(state, action)`: Pure state transition returning `{ reward, done }`.
  - `isOver(state)`: Returns boolean indicating victory or player demise.
  - `score(state)`: Performance metric based on trials cleared, class tiers unlocked, and battle efficiency.
