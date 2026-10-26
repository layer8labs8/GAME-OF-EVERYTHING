# 0023 - Arena Shooter ("Crimson Arena")

## Concept & Theme
A high-intensity top-down arena survival shooter set in a gladiatorial combat chamber. The combatant faces escalating waves of biomechanical insectoids and siege juggernauts while managing weapon ammunition and tactical dodge rolls.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes arena, player, weapon loadouts, and initial wave.
- `legalActions(state)`: Returns valid tactical actions including movement, weapon selection, and directional firing.
- `step(state, action)`: Mutates state in place, executes player command, resolves projectile impacts, moves swarms, and returns `{ reward, done }`.
- `isOver(state)`: Returns boolean indicating victory, defeat, or maximum step limit reached.
- `score(state)`: Returns current score.

## Weapons
- **Blaster**: Standard sidearm with infinite ammunition (15 damage).
- **Shotgun**: Triple-pellet spread dealing up to 45 damage at close range (consumes 1 shell).
- **Plasma Cannon**: High-energy linear beam that pierces through multiple enemies in a line (40 damage, consumes 1 battery).

## Hostiles
- **Swarm Drone**: Fast, 15 HP, swarms player in groups.
- **Acid Spitter**: 30 HP, attacks from range with bio-mortar shots.
- **Siege Juggernaut**: 90 HP, armored brute with heavy ground smash.

## Victory & Defeat
- **Victory**: Clear all 5 combat waves.
- **Defeat**: Player HP drops to 0.
- **Termination**: `isOver(state) === true`.
