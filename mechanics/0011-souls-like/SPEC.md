# 0011 - Souls-like ("Ashen Knight")

## Concept & Theme
A grimdark, precision combat boss duel inspired by Soulsborne titles. An Ashen Champion confronts the fearsome Ember Lord inside a desecrated sanctuary. Victory demands disciplined stamina management, timed dodge rolls with invulnerability frames, strategic poise breaks, and measured healing flask usage.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes player with 100 HP, 100 stamina, 3 estus flasks, and the Ember Lord boss (250 HP, Phase 1).
- `legalActions(state)`: Returns valid tactical combat actions based on current stamina and boss stagger conditions.
- `step(state, action)`: Mutates state in place, executes combat maneuver, resolves boss telegraphed assault, handles phase 2 transitions, and returns `{ reward, done }`.
- `isOver(state)`: Returns true when the Ember Lord is slain or player HP drops to 0.
- `score(state)`: Returns score derived from damage dealt, poise breaks, remaining flasks, and victory bonus.

## Actions
- `light_slash`: Swift blade strike (15 damage, 15 stamina, 15 poise damage).
- `heavy_thrust`: High-impact thrust (32 damage, 30 stamina, 35 poise damage).
- `visceral_strike`: Devastating critical execute available only when boss is staggered (65 damage, 20 stamina).
- `dodge_roll`: Evasive maneuver granting invulnerability against incoming strike (costs 25 stamina).
- `parry`: Precision timing deflection; if boss attacks, negates damage and inflicts instant 50 poise damage (costs 20 stamina).
- `block`: Raises heavy kite shield, absorbing 75% incoming damage (costs 15 stamina).
- `heal`: Quaffs Estus Flask, restoring 40 HP (costs 1 flask, 3 max).
- `rest`: Lowers guard to recover 40 stamina up to 100 max.

## Boss Phases
- **Phase 1 (The Greatsword King)**: 250 to 125 HP. Telegraphed sweeping slashes and leap slams.
- **Phase 2 (Ember Unleashed)**: Under 125 HP. Boss ignites with flame aura, increasing speed and unleashing flaming shockwave combos.

## Victory & Defeat
- **Victory**: Reduce the Ember Lord's HP to 0.
- **Defeat**: Player HP drops to 0.
- **Termination**: `isOver(state) === true`.
