# 0106-naval-combat: Ironclad Broadside

A tactical naval combat simulator featuring line-of-battle maneuvering, directional firing arcs (bow chaser, port broadside, starboard broadside), wind dynamics, and armor plating damage.

## Core Rules & Features
- **Grid & Arena**:
  - 7x7 maritime sector (`x: 0..6, y: 0..6`).
  - Wind Direction: Global prevailing wind (North, East, South, West) rotating deterministically every 6 turns. Sailing with the wind grants +1 movement reach.
- **Ship Orientation & Arcs**:
  - Headings: `N` (up, y-1), `E` (right, x+1), `S` (down, y+1), `W` (left, x-1).
  - Port (left beam) and Starboard (right beam) broadsides fire across a 3-tile perpendicular sweep.
  - Bow chasers fire 2 tiles directly ahead.
  - "Crossing the T": Delivering broadsides against a target facing your guns deals +50% critical armor-piercing damage.
- **Vessels**:
  - **Player Flagship (Dreadnought)**: 120 Hull HP, 40 Bow/Stern armor, 60 Port/Starboard armor, 2 salvos per battery reload.
  - **Enemy Flotilla**:
    - 1x Raider Corvette (Fast, 50 Hull HP, agile bow torpedoes).
    - 1x Armored Frigate (Medium, 75 Hull HP, twin broadside batteries).
    - 1x Heavy Ironclad (Flagship class, 100 Hull HP, reinforced belt armor).
- **Player Actions**:
  - `sail_ahead`: Advances 1 grid step along current heading (or 2 if running downwind).
  - `rudder_port`: Rotates heading 90 degrees counter-clockwise.
  - `rudder_starboard`: Rotates heading 90 degrees clockwise.
  - `fire_broadside_port`: Discharges port battery perpendicular to left flank (range 1-3).
  - `fire_broadside_starboard`: Discharges starboard battery perpendicular to right flank (range 1-3).
  - `fire_bow_chaser`: Fires long-range bow cannons directly along forward vector (range 1-3).
  - `damage_control`: Engages emergency bilge pumps and patch crews (+18 Hull HP, consumes turn).
- **Enemy Turn Phase**:
  - Following the player's action, surviving enemy ships maneuver deterministically: turn toward player, align broadside or bow firing solutions, and execute salvos if target is within arc.
- **Termination & Score**:
  - **Victory**: All 3 enemy warships sunk.
  - **Defeat**: Player flagship hull reduced to 0 HP, or maximum turns (`MAX_TURNS = 40`) reached before sinking flotilla.
  - **Score**: Sunk tonnage (points per enemy class), remaining flagship hull, and turn speed bonus.
- **Bot Contract**:
  - `createState(seed)`: Initializes deterministic sea conditions and ship placements.
  - `legalActions(state)`: Returns valid tactical navigational orders and weapon solutions.
  - `step(state, action)`: Executes maneuvers, computes ballistics/damage, returns `{ reward, done }`.
  - `isOver(state)`: Returns boolean terminal state.
  - `score(state)`: Evaluates battle efficiency and survival.
