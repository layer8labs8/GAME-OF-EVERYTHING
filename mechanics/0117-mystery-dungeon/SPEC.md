# 0117-mystery-dungeon: Mystery Labyrinth: Wanderer's Descent

A classic turn-synchronized Mystery Dungeon crawler featuring synchronized movement, stomach/belly hunger mechanics, directional tactical melee, consumable wands/scrolls/food, and multi-floor labyrinth descent culminating in the Minotaur Guardian.

## Overview

In **Mystery Labyrinth: Wanderer's Descent**, every action taken by the player (moving, attacking, using items, resting) advances time by exactly one turn, allowing dungeon monsters to simultaneously take their step. Survival requires balancing physical combat with vital resource logistics: managing Stomach fullness (Belly) through gathered rations, utilizing magic wands and explosive scrolls, navigating hidden floor traps, and descending through 4 increasingly perilous dungeon depths.

## Core Mechanics

- **Turn-Synchronized Action**:
  - Moving, attacking, waiting, or consuming an item takes 1 full turn.
  - All living dungeon creatures take 1 step or melee strike in synchronization immediately following player resolution.
- **Hunger & Belly System**:
  - The wanderer begins with 100/100 Belly.
  - Every action depletes Belly by 1.
  - Consuming Rations (`apple`) restores +50 Belly up to 100.
  - If Belly reaches 0, Starvation sets in: the player loses 2 HP every single turn.
  - While Belly > 0, the player slowly regenerates 1 HP every 3 resting/movement turns.
- **Labyrinth Exploration (8x8 Grid, 4 Floors)**:
  - Floor 1: Mossy Vaults (Cavern Slimes & Cave Bats).
  - Floor 2: Forgotten Crypt (Bone Skeletons & Shadow Fiends).
  - Floor 3: Deep Magma Forge (Fire Elementals & Orc Sentinels).
  - Floor 4: Sanctum of the Minotaur (The Boss Guardian and the Golden Relic).
  - Stairs (`>`) on Floors 1-3 lead downward.
- **Inventory & Consumables**:
  - `Apple`: Restores 50 Belly.
  - `Sleep Wand`: Projects a ranged beam that puts the target monster to sleep for 3 turns.
  - `Blast Scroll`: Detonates a 3x3 arcane shockwave dealing 30 damage to all surrounding foes.
  - `Healing Herb`: Restores 40 HP instantly.
- **Victory & Defeat**:
  - **Victory**: Slay the Minotaur Guardian on Floor 4 and claim the Golden Relic.
  - **Defeat**: Player HP drops to 0 (combat or starvation), or turns exceed 200.

## Determinism & Bot Interface

- Pure deterministic Bot Contract:
  - `createState(seed)`: Procedurally builds 8x8 floor layout, item spawns, monster placements from seed.
  - `legalActions(state)`: Returns array of valid commands (`move:<dir>`, `attack:<dir>`, `wait`, `use:<slot>`, `descend`).
  - `step(state, action)`: Pure functional state transition returning `{ reward, done }`.
  - `isOver(state)`: Returns boolean indicating labyrinth victory or player demise.
  - `score(state)`: Metric of performance based on floors reached, foes vanquished, belly efficiency, and relic acquired.
