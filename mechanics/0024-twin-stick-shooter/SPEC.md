# 0024 - Twin Stick Shooter ("Vortex Core")

## Concept & Theme
A neon-vector twin-stick space combat arena. The player controls a high-agility assault ship capable of independent 8-directional movement and 8-directional precision firing, battling encircling hordes of seeker drones, orbiting turrets, and explosive pulsar mines.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes arena, ship coordinates, shield integrity, smart bombs, and wave 1 swarms.
- `legalActions(state)`: Returns valid tactical commands (directional movement, aiming/firing vectors, and smart bomb deployment).
- `step(state, action)`: Mutates state in place, executes player thrust/fire, advances projectiles, simulates enemy flight paths, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if player shields reach 0, all 5 waves are cleared, or max steps reached.
- `score(state)`: Returns current score.

## Actions
- Movement: `move_n`, `move_s`, `move_e`, `move_w`
- Firing: `fire_n`, `fire_s`, `fire_e`, `fire_w`, `fire_ne`, `fire_nw`, `fire_se`, `fire_sw`
- Special: `bomb` (screen-clearing EMP blast, destroys bullets and inflicts 40 area damage)
- Tactical: `wait` (drifts under current momentum)

## Hostiles
- **Seeker Drone**: Fast, lightly armored interceptor that homes in directly on the player ship.
- **Orbiting Turret**: Circles arena perimeter and fires plasma bursts toward player center.
- **Pulsar Mine**: Drifting heavy explosive that detonates into shrapnel when destroyed.

## Victory & Defeat
- **Victory**: Destroy all enemy waves (5 waves).
- **Defeat**: Ship shields drop to 0.
- **Termination**: `isOver(state) === true`.
