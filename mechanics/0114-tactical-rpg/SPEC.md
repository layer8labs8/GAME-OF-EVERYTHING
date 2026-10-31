# 0114-tactical-rpg: Strike Protocol: Tactical Vanguard

A squad tactical RPG featuring 2-Action-Point economy, dynamic cover mechanics (Half/Full cover), reaction Overwatch ambushes, flanking/exposed critical vulnerabilities, and tactical loadouts.

## Overview

In **Strike Protocol: Tactical Vanguard**, the player commands a 3-agent elite tactical squad (Pointman, Sniper, Support) deployed in an urban grid combat zone against hostile alien syndicate operatives (Enforcer, Scout, Psion). Combat resolves around maneuvering between cover obstacles, establishing defensive Overwatch kill-zones, executing flanking angles to bypass enemy defense, and managing ammunition clips.

## Core Mechanics

- **Grid Arena & Cover System (7x6)**:
  - `Clear` (`.`): Open ground (0% cover defense, vulnerable to flanked criticals).
  - `Half Cover` (`h`): Low barricades/crates (+25% defense against frontal fire).
  - `Full Cover` (`H`): High concrete pillars/armor walls (+50% defense against frontal fire).
  - `Flanking`: An attacker striking from an angle that bypasses the defender's cover negates cover defense entirely and gains +35% Critical Strike chance.
- **2-Action Point Economy (AP)**:
  - Each operative starts their turn with 2 Action Points:
    - `Move`: Consumes 1 AP (range based on mobility).
    - `Shoot`: Consumes 1 AP and 1 Ammo.
    - `Overwatch`: Consumes 1 AP and enters defensive posture. Automatically triggers a reaction fire attack when an enemy moves within line of sight.
    - `Reload`: Consumes 1 AP to restore magazine to full capacity.
    - `Special Skill`: Consumes 1 AP (Pointman *Buckshot Cleave*, Sniper *Headshot*, Support *Field Medkit*).
- **Squad Operatives**:
  - **Pointman**: HP 90, Atk 30 (high close-range damage), Range 1-3, Ammo 3, Mobility 3. Skill: *Breach Shot* (deals massive unmitigated damage at point-blank range).
  - **Sniper**: HP 60, Atk 36 (devastating precision), Range 2-6, Ammo 3, Mobility 2. Skill: *Deadeye* (+50% critical chance regardless of cover).
  - **Support**: HP 75, Atk 22, Range 1-4, Ammo 4, Mobility 3. Skill: *Field Dressing* (restores 30 HP to self or adjacent wounded squadmate).
- **Hostile Syndicate Units**:
  - **Enforcer**: HP 110, Atk 26, Heavy armor plating.
  - **Scout**: HP 60, Atk 20, High mobility flanking specialist.
  - **Psion**: HP 50, Atk 28, Mind Blast bypassing half-cover.
- **Victory & Defeat**:
  - **Victory**: Eliminate all syndicate hostiles.
  - **Defeat**: All squad operatives fall in combat, or turns exceed 120.

## Determinism & Bot Interface

- Pure deterministic Bot Contract:
  - `createState(seed)`: Procedurally builds deterministic cover placement, starting deployments, and unit stats.
  - `legalActions(state)`: Returns array of valid commands (`move:x,y`, `shoot:targetId`, `overwatch`, `reload`, `skill:targetId`, `end_turn`).
  - `step(state, action)`: Pure state transition returning `{ reward, done }`.
  - `isOver(state)`: Returns boolean indicating mission victory or squad elimination.
  - `score(state)`: Performance metric based on enemies dispatched, health retained, and tactical efficiency.
