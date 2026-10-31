# 0122-roguelite: Nether Ascendance

A roguelite dungeon crawler featuring permanent meta-progression across runs, persistent Nether Essence currency, Death Defiance revivals, divine boons, and underworld escape chambers.

## Overview

Unlike traditional roguelikes where failure erases all progression, **Nether Ascendance** is defined by persistent meta-progression. Across repeated dungeon runs, the shade collects **Nether Essence** from vanquished underworld fiends. Falling in battle returns the player to the Stygian Sanctuary where gathered essence fuels permanent upgrades—amplifying baseline vitality, offensive strength, death defiance extra lives, and essence harvest rates—turning subsequent escape attempts progressively more lethal against the Underworld Warden.

## Core Mechanics

- **Meta-Progression & Stygian Sanctuary**:
  - `Vitality`: Permanently grants +20 Max HP per rank.
  - `Strength`: Permanently grants +5 Attack per rank.
  - `Death Defiance`: Grants up to 2 extra lives per run, resurrecting at 50% HP upon fatal damage.
  - `Essence Harvest`: Boosts essence drop yields by +25% per rank.
- **In-Run Chambers & Divine Boons**:
  - Chamber 1: Brimstone Ghouls (Yields starter essence).
  - Chamber 2: Tartarus Phalanx (Armored spear guards).
  - Chamber 3: Stygian Hydras (Multi-striking serpent).
  - Chamber 4: The Underworld Warden (Apex guardian of the Nether Gate).
  - Clearing a chamber grants a choice of temporary run Boons:
    - `Flame Boon`: Attacks inflict lingering burn damage.
    - `Lightning Boon`: Attacks chain lightning shocks to secondary targets.
    - `Frost Boon`: Slows enemy attacks and reduces incoming damage.
- **Run Loop & Mortality**:
  - Hero maneuvers between combat actions (`attack`, `special`, `dash`).
  - If HP drops to 0 without Death Defiance, the hero dissolves into red mist and re-emerges in the Stygian Sanctuary with all accumulated Essence intact.
- **Victory & Defeat**:
  - **Victory**: Slay the Underworld Warden in Chamber 4 and escape to the surface.
  - **Defeat**: Exceeding 200 operational turns across runs.

## Determinism & Bot Interface

- Pure deterministic Bot Contract:
  - `createState(seed)`: Seeds initial underworld layout, monsters, and sanctuary ledger.
  - `legalActions(state)`: Returns array of valid commands (`upgrade:<type>`, `start_run`, `attack`, `special`, `dash`, `boon:<type>`, `next_chamber`).
  - `step(state, action)`: Pure functional state transition returning `{ reward, done }`.
  - `isOver(state)`: Returns boolean indicating underworld escape or turn expiration.
  - `score(state)`: Metric of performance based on chambers conquered, upgrades forged, and enemies dispatched.
