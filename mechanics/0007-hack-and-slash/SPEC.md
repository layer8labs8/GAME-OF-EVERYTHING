# 0007 - Hack and Slash ("Blade Mirage")

## Concept & Theme
A swift, fluid side-scrolling 2D combat arena where a cybernetic blade master confronts legions of corrupted shadow wraiths. The core loop revolves around chain combos, air juggles, high-speed dash strikes, and precision parries against telegraphed enemy assaults.

## Bot Contract
The game logic exports the following deterministic functions:
- `createState(seed, options)`: Returns initial state with player, stamina, combo meter, and initial wave.
- `legalActions(state)`: Returns array of valid actions based on player state and cooldowns.
- `step(state, action)`: Pure state transition function returning a new game state.
- `isOver(state)`: Returns true if player HP reaches 0 or all waves (5 waves) are cleared or max steps reached.
- `score(state)`: Returns numeric score derived from kills, combo multiplier, and wave bonuses.

## Actions
- `move_left`: Move left across the floor (bounded at x = 0).
- `move_right`: Move right across the floor (bounded at x = 400).
- `jump`: Leap into the air (sets vertical velocity).
- `slash`: 3-stage combo ground attack (Light Slash -> Crescent Cut -> Phantom Finisher).
- `air_slash`: Downward dive slash effective against aerial enemies.
- `dash_strike`: High-speed forward pierce dealing 30 damage to all enemies in dash path (costs 25 stamina).
- `parry`: Raises a defensive blade barrier for 1 turn. If struck, completely negates damage, stuns attacker, and counter-attacks for 20 damage.
- `rest`: Recovers 40 stamina up to 100 max.
- `idle`: Wait one step without acting.

## Entities
- **Player**: Position `(x, y)`, `hp` (max 100), `stamina` (max 100), `combo` count, `isAirborne`, `parryActive`.
- **Enemies**:
  - `Grunt`: Standard melee fighter that slashes forward when in range.
  - `Specter`: Flying aerial foe diving at player.
  - `Shadow Knight`: Heavy armored knight with shield. Vulnerable after parry or during attack windup.

## Victory & Defeat
- **Victory**: Clear all 5 enemy waves.
- **Defeat**: Player HP drops to 0.
- **Termination**: `isOver(state) === true`.
