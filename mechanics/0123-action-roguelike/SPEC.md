# 0123-action-roguelike: Void Breach: Action Roguelike

A fast-paced bullet hell action roguelike featuring omnidirectional shooting, tactical dodge rolling with invulnerability frames, active reload, procedural chamber waves, and stackable item synergies.

## Overview

In **Void Breach**, the player maneuvers an elite gunner through four escalating hostile quarantine chambers infested with void bio-terrors. Survival hinges upon evasive footwork, threading through dense enemy bullet patterns with timed dash rolls, aiming precision volleys, and assembling run-defining weapon augmentations (Triple Spread, Homing Plasma, Explosive Munitions) culminating in the battle against the Void Overlord.

## Core Mechanics

- **Arena Movement & Evasive Dash**:
  - Arena grid (8x8): Moving repositions the gunner while dodging incoming projectiles.
  - `dash:<dir>`: Propels the player 2 tiles with complete invulnerability frames (clears through bullet hazards).
- **Shooting & Weapon Synergies**:
  - `shoot:<dir>`: Fires energy volleys in cardinal directions.
  - Weapon Perks (Acquired upon clearing waves):
    - `Triple Spread`: Fires a 3-way divergent spread of projectiles.
    - `Homing Rounds`: Plasma seekers adjust course toward the nearest hostile.
    - `Explosive Burst`: Impact deals radial area-of-effect blast damage to adjacent foes.
- **Wave Progression**:
  - Wave 1: Void Spitters (Ranged bio-slugs firing telegraphed spit).
  - Wave 2: Crimson Stalkers (Fast melee chasers attempting surround tactics).
  - Wave 3: Plasma Goliaths (Heavy turrets discharging radial bullet barrages).
  - Wave 4: The Void Overlord (Apex multi-phase boss with bullet hell spirals).
- **Victory & Defeat**:
  - **Victory**: Slay the Void Overlord in Wave 4.
  - **Defeat**: Player HP reaches 0, or turns exceed 150.

## Determinism & Bot Interface

- Pure deterministic Bot Contract:
  - `createState(seed)`: Procedurally builds arena layout, enemy waves, and bullet seeds.
  - `legalActions(state)`: Returns array of valid commands (`move:<dir>`, `shoot:<dir>`, `dash:<dir>`, `choose_perk:<perk>`, `wait`).
  - `step(state, action)`: Pure functional state transition returning `{ reward, done }`.
  - `isOver(state)`: Returns boolean indicating breach closure or operator demise.
  - `score(state)`: Metric of performance based on waves cleared, damage dealt, bullets grazed, and accuracy.
