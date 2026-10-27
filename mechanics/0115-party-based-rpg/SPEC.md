# 0115-party-based-rpg: Guild Expedition: Darkest Depths

A Darkest Dungeon-inspired 4-hero party-based RPG featuring strict rank formation positioning, dual HP/Stress morale management, class synergy combos, affliction crises, and a multi-chamber dungeon expedition.

## Overview

In **Guild Expedition: Darkest Depths**, the player directs a specialized 4-adventurer guild guild party (Crusader, Highwayman, Vestal, Occultist) delving through an accursed crypt against eldritch abominations culminating in the ancient Lich Lord. Combat emphasizes rank formation mechanics where skill eligibility and targeting strictly depend on party ranks (Ranks 1-4) versus enemy ranks, alongside managing both physical health and psychological Stress.

## Core Mechanics

- **4-Rank Formation**:
  - **Rank 1 (Front)**: Crusader (Heavy frontline tank, HP 100, Def 10, Stress 0/100). Skills: *Smite* (hits Enemy R1-R2), *Holy Shield* (guards adjacent ally and mitigates 50% damage).
  - **Rank 2 (Mid-Front)**: Highwayman (Agile skirmisher, HP 70, Def 4, Stress 0/100). Skills: *Wicked Slice* (hits Enemy R1-R2), *Pistol Shot* (targets Enemy R2-R4).
  - **Rank 3 (Mid-Back)**: Vestal (Sanctified healer, HP 60, Def 3, Stress 0/100). Skills: *Divine Grace* (heals single ally for 28 HP), *Sanctuary* (reduces party stress by 15).
  - **Rank 4 (Rear)**: Occultist (Eldritch scholar, HP 55, Def 2, Stress 0/100). Skills: *Abyssal Artillery* (hits backline Enemy R3-R4 for high magic damage), *Curse of Weakness* (reduces enemy attack).
- **Dual Damage: Health & Morale Stress**:
  - Enemies deal physical HP damage and psychological Stress damage (Horror screams, eldritch rot).
  - If a hero reaches 100 Stress, an Affliction test occurs: they become *Afflicted* (-20% damage, periodic panic) or *Virtuous* (clears stress, boosts party morale).
  - If a hero reaches 0 HP, they enter *Death's Door* (further unblocked hits risk permanent demise).
- **4-Room Dungeon Expedition**:
  - Room 1: Skeleton Vanguard (Bone Soldiers & Arbalest).
  - Room 2: Cultist Coven (Acolytes & Mad Prophets inflicting stress).
  - Room 3: Deep Abyssal Horrors (Tentacle Brutes).
  - Room 4: The Ancient Lich King (Boss with reviving minions and cataclysm spells).
- **Victory & Defeat**:
  - **Victory**: Slay the Ancient Lich King in Room 4 and secure the guild relic.
  - **Defeat**: Entire adventuring party is wiped out, or turns exceed 140.

## Determinism & Bot Interface

- Pure deterministic Bot Contract:
  - `createState(seed)`: Initializes deterministic party stats, room progression, and enemy seeds.
  - `legalActions(state)`: Returns array of valid commands based on active hero's rank and abilities (`skill:<name>:<targetRank>`, `heal:<rank>`, `pass`, `swap:<r1>,<r2>`).
  - `step(state, action)`: Pure functional state transition returning `{ reward, done }`.
  - `isOver(state)`: Returns boolean indicating victory or party wipeout.
  - `score(state)`: Metric of performance based on rooms cleared, monsters slain, surviving members, and sanity preserved.
