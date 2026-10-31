# 0014 - 2D Fighting ("Clash of Titans")

## Concept & Theme
A technical 1v1 side-view fighting arena. Two martial arts masters engage in high-stakes hand-to-hand dueling featuring footsies, high/low guard blocks, fireball zoning, anti-air dragon uppercuts, and cinematic super arts.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes fighter positions (player at left, rival at right), 100 HP each, round 1, and zero super meter.
- `legalActions(state)`: Returns valid offensive, defensive, and mobility actions based on spacing and super gauge.
- `step(state, action)`: Mutates state in place, resolves simultaneous attack frames, hitboxes, blocks, AI counter-actions, and returns `{ reward, done }`.
- `isOver(state)`: Returns true when either fighter wins 2 rounds or maximum step count is reached.
- `score(state)`: Returns score based on round victories, clean hits, and defensive blocks.

## Actions
- `step_forward`: Closes distance toward opponent.
- `step_back`: Retreats away from opponent.
- `jump`: Leaps into the air for jump-in aerial attacks.
- `crouch`: Ducks low to evade high projectiles and sweeps.
- `light_punch`: Fast 4-frame jab (10 damage, builds 8 super gauge).
- `heavy_kick`: High-impact roundhouse kick (24 damage, builds 15 super gauge).
- `hadouken`: Ki blast projectile traveling forward (18 damage, costs 20 stamina).
- `dragon_uppercut`: Invulnerable rising fist strike effective against jumping opponents (32 damage, costs 30 stamina).
- `block`: Guard stance reducing incoming damage by 85%.
- `super`: Screen-freezing ultimate strike (50 unblockable damage, consumes 100 super gauge).

## Victory & Defeat
- **Victory**: Win 2 rounds against the rival combatant.
- **Defeat**: Lose 2 rounds to the rival combatant.
- **Termination**: `isOver(state) === true`.
