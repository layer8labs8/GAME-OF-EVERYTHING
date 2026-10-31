# 0013 - Time Slowdown ("Chrono Matrix")

## Concept & Theme
A tactical turn-based action game where time progresses only when the player takes an action. Players navigate a high-contrast 10x10 tactical room, dodging incoming bullet trajectories, disarming red agents, and orchestrating fluid elimination sequences.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Creates the initial game state with room 1, obstacles, player at starting position, and red hostile agents.
- `legalActions(state)`: Returns legal actions given current position, ammo, and adjacent tiles.
- `step(state, action)`: Mutates state in place, executes player move/attack, advances bullets, triggers enemy responses, and returns `{ reward, done }`.
- `isOver(state)`: Returns boolean indicating victory, defeat, or step exhaustion.
- `score(state)`: Returns current integer score.

## Actions
- `move_n`, `move_s`, `move_e`, `move_w`: Step to an adjacent open floor tile.
- `shoot_n`, `shoot_s`, `shoot_e`, `shoot_w`: Discharge pistol projectile in cardinal direction (costs 1 ammo).
- `punch_n`, `punch_s`, `punch_e`, `punch_w`: Strike an adjacent enemy for 2 damage and recover 1 ammo.
- `wait`: Hold position for one turn, letting bullets and hostiles advance.

## Mechanics
- **Time Stop**: Nothing moves unless the player takes an action.
- **Bullet Trajectories**: Bullets advance 1 tile per turn. Players can step out of a bullet's path to dodge it.
- **Pillars & Cover**: Solid concrete pillars block bullets and obstruct enemy vision.
- **Ammo Scavenging**: Eliminating enemies drops ammo clips or grants ammo via melee disarm.
- **Rooms**: Clear 3 hostile rooms to achieve total breach victory.
