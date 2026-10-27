# 0113-strategy-rpg: Tactics of Aethelgard

A grid-based tactical strategy RPG featuring squad positioning, directional flanking, elevation/terrain bonuses, class archetypes, and turn-based tactical squad warfare.

## Overview

In **Tactics of Aethelgard**, the player commands a tactical strike team (Lord Commander, Elven Ranger, High Mage) deployed on a 6x6 tactical battlefield against an invading Shadow Legion (Shadow Warlord, Dark Archer, Necromancer). Units maneuver across diverse terrain (Plains, Forest cover, Hill elevation) using movement allowances, flanking maneuvers (rear/side strike damage bonuses), class-specific ranges and tactical special skills.

## Core Mechanics

- **Grid & Terrain (6x6)**:
  - `Plains` (`.`): Standard footing (1 Move cost, +0% Def).
  - `Forest` (`F`): Dense tree canopy (+20% Defense cover, 1 Move cost).
  - `Hill` (`H`): High ground (+1 Attack range bonus, +15% Damage output, 1 Move cost).
- **Squad Classes**:
  - **Commander** (Melee Frontliner): HP 110, Atk 28, Def 10, Move 2, Range 1. Special: *Shield Bash* (stuns target for 1 turn and deals heavy damage).
  - **Ranger** (Ranged Sniper): HP 65, Atk 24, Def 4, Move 2, Range 2-3. Special: *Deadly Aim* (high-critical single-target shot, ignores terrain cover).
  - **Mage** (Arcane Blaster): HP 55, Atk 32, Def 3, Move 2, Range 1-2, MP 40. Special: *Chain Lightning* (strikes primary foe and arc-shocks adjacent foe for 20 MP).
- **Positional Advantage**:
  - Frontal assault: 1.0x damage.
  - Flanking (side assault): 1.25x damage multiplier.
  - Backstab (rear assault): 1.50x damage multiplier.
- **Turn Flow**:
  - **Player Phase**: The player commands each unacted squad unit in turn. A unit can Move, then perform an Attack or Special Skill, or directly `wait`.
  - **Enemy Phase**: Once all player units have taken their turn (or rested), enemy AI units maneuver and execute attacks against the most advantageous target.
- **Victory & Defeat**:
  - **Victory**: Eliminate all enemy units, including the Shadow Warlord.
  - **Defeat**: The Commander falls in battle, or all player units are wiped out, or turns exceed 120.

## Determinism & Bot Interface

- Pure deterministic Bot Contract:
  - `createState(seed)`: Initializes deterministic battlefield terrain, unit deployments, and stats from seed.
  - `legalActions(state)`: Returns array of valid actions (`move:x,y`, `attack:targetId`, `skill:targetId`, `wait`).
  - `step(state, action)`: Pure functional state transition returning `{ reward, done }`.
  - `isOver(state)`: Returns boolean indicating mission completion or defeat.
  - `score(state)`: Metric of performance based on enemies slain, survival, and round efficiency.
