# 0026 - Side-scrolling Shooter ("Aero Striker")

## Concept & Theme
A high-velocity horizontal side-scrolling space shoot-'em-up inspired by arcade classics like Gradius and R-Type. Piloting the experimental aero-space fighter *Aero Striker*, players traverse treacherous asteroid corridors, destroy hostile enemy squadrons, deploy tracking torpedoes, activate kinetic deflector shields, and engage the massive Void Dreadnought flagship.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes fighter with 100 HP, 3 missile charges, 2 barrier shield charges, at left sector `(x: 50, y: 200)`.
- `legalActions(state)`: Returns valid flight maneuvers, ordnance launches, and defensive barriers.
- `step(state, action)`: Mutates state in place, scrolls stars/asteroids, updates player/enemy positions, advances projectiles, resolves collisions, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if player HP reaches 0, the Void Dreadnought is annihilated, or max step limit (160 turns) reached.
- `score(state)`: Returns total points based on hostiles downed, wave clearances, missile accuracy, and boss destruction bonus.

## Actions
- `move_up`, `move_down`, `move_forward`, `move_back`: Tactical vector maneuvers (clamps within flight corridor).
- `fire`: Discharges forward dual plasma cannons (25 damage, range full screen width).
- `missile`: Fires heavy homing torpedo angled toward the most dangerous hostile target (45 damage, consumes 1 missile).
- `barrier_shield`: Activates front kinetic deflection barrier absorbing all incoming enemy fire for 2 turns (consumes 1 shield).
- `rest`: Engine cooling focus, regenerating 15 HP (if damaged) or preparing rapid cannon fire.

## Hostiles & Bosses
- **Scout Interceptor**: Fast fighter flying in oscillating waves (15 HP, 8 damage).
- **Heavy Corvette**: Armored gunship firing spread salvos (40 HP, 16 damage).
- **Void Dreadnought**: Massive capital ship boss featuring a shielded core and laser salvos (120 HP, 25 damage).

## Victory & Defeat
- **Victory**: Defeat all 3 enemy wings and obliterate the Void Dreadnought flagship.
- **Defeat**: Starfighter HP drops to 0 or step limit expires.
