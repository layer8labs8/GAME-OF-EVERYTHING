# 0094-real-time-tactics: Commando Strike (Real-Time Tactics)

A real-time tactics (RTT) tactical infiltration combat game where the player commands a specialized 3-operator commando unit (Sniper, Heavy Gunner, and Saboteur) maneuvering across an 8x8 battlefield with cover, line-of-sight positioning, ambush firing, and objective extraction.

## Core Rules & Features
- **Tactical RTT Principle**: No base construction or resource harvesting; success depends solely on fire-and-maneuver squad tactics and ability synergies.
- **8x8 Battlefield Grid**:
  - Open Ground: Standard movement and line of sight.
  - Sandbag Cover: Grants 50% incoming ballistic damage mitigation.
  - Concrete Walls: Impassable structures obstructing movement and ballistic trajectories.
  - Hostage / Bunker Extraction Zone: Objective point at coordinate (7, 7).
- **Player Commando Squad**:
  - **Sniper ("Eagle")**: High range (Range 4), accurate rifle (45 dmg), low durability (50 HP). Special: `headshot` (75 dmg, Range 5).
  - **Heavy Gunner ("Rhino")**: Durable vanguard (120 HP, 15% armor), auto-cannon (30 dmg, Range 2). Special: `suppress` (Pins enemy in place).
  - **Saboteur / Medic ("Fox")**: Tactical specialist (70 HP, Range 2, 20 dmg). Special: `field_medkit` (Restores +40 HP to adjacent operative).
- **Enemy Syndicate Forces**:
  - Syndicate Sentries (50 HP, Range 2, 15 dmg).
  - Heavy Watchtower Turret (90 HP, Range 3, 20 dmg).
  - Syndicate Commander (140 HP, Range 2, 25 dmg).
- **Tactical Orders (Actions)**:
  - `move:{unitId}:{r},{c}`: Reposition operative up to movement range.
  - `attack:{unitId}:{targetId}`: Direct fire on enemy in range and line of sight.
  - `headshot:{targetId}`: Sniper precision critical assassination.
  - `heal:{targetAllyId}`: Field medical treatment.
  - `wait`: Hold sector, trigger defensive overwatch against enemy movement, and advance 1 simulation tick.
- **Simulation Loop & Enemy AI**:
  - Enemies maintain alert states: patrols advance towards gunfire or engage spotted commandos in visual range.
  - Overlapping fields of fire and cover positioning govern damage calculations.
- **Victory & Defeat**:
  - **Mission Complete**: Eliminating the Syndicate Commander and occupying the Extraction Bunker.
  - **Mission Failed**: Total annihilation of the commando squad.
  - **Timeout (60 Ticks)**: Resolves by enemy casualties inflicted and objective proximity.
- **Bot Contract**:
  - `createState(seed)`: Returns initialized squad, grid map layout, cover points, and enemy patrols.
  - `legalActions(state)`: Produces array of legal squad commands (`move:*`, `attack:*`, `headshot:*`, `heal:*`, `wait`).
  - `step(state, action)`: Applies tactical order, simulates enemy actions, resolves firefights. Returns `{ reward, done }`.
  - `isOver(state)`: Returns whether mission objectives or squad wipe occurred.
  - `score(state)`: Evaluates objectives secured, enemies eliminated, squad health preserved.
