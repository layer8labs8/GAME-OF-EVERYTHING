# 0092-real-time-strategy: Iron Siege RTS

A classic sci-fi real-time strategy (RTS) command game featuring worker mineral harvesting, base infrastructure construction, combined-arms army training (Marines and Siege Tanks), lane positioning, and enemy base core annihilation.

## Core Rules & Features
- **Base Infrastructure**:
  - **Command Core (500 HP)**: Central base node; train harvesters. Losing the core triggers defeat.
  - **Mineral Harvesters**: Gather +2 minerals per tick up to a max economic saturation of 6 workers.
  - **Barracks (100 minerals)**: Essential military facility required to train Marine infantry.
  - **Heavy Factory (150 minerals)**: Advanced mechanized tech lab required to construct Siege Tanks.
  - **Perimeter Turret (75 minerals)**: Defensive automated gun turret dealing 15 damage per tick to attacking incursions.
- **Combined-Arms Strike Units**:
  - **Marine (50 minerals)**: Rapid assault trooper (40 HP, 10 damage/tick).
  - **Siege Tank (100 minerals)**: Armored tracked artillery (90 HP, 25 damage/tick).
- **Battlefield Lanes & Staging**:
  - Position 0: Blue Command Base (Player home sector).
  - Position 1: Contested Neutral Ridge (Mid-field strategic choke point).
  - Position 2: Red Command Citadel (Enemy headquarters).
- **Tactical Commands (Actions)**:
  - `tick`: Pass 1 simulation cycle; collects minerals, advances battles, and lets Enemy AI plan.
  - `train_worker`: Train a new mineral harvester (Costs 50 minerals).
  - `build_barracks`: Construct Barracks (Costs 100 minerals).
  - `build_factory`: Construct Heavy Factory (Costs 150 minerals).
  - `build_turret`: Install Perimeter Turret (Costs 75 minerals).
  - `train_marine`: Train Marine (Costs 50 minerals, requires Barracks).
  - `train_tank`: Construct Tank (Costs 100 minerals, requires Factory).
  - `order_advance`: Advance strike force forward towards enemy lines.
  - `order_retreat`: Pull forces back towards friendly base and turrets.
- **Simulation Loop & AI Behavior**:
  - Each action triggers a simulation tick where production concludes, units deal damage to opposing forces occupying the same position, and surviving troops besiege enemy bases.
  - Enemy AI automates mineral harvesting, constructs barracks/factories, trains assault waves, and mounts aggressive pushes on player positions.
- **Victory & Defeat**:
  - **Decisive Victory**: Reducing Enemy Command Core HP to 0.
  - **Defeat**: Player Command Core destroyed.
  - **Timeout (150 Ticks)**: Evaluated by remaining Core HP and army asset value.
- **Bot Contract**:
  - `createState(seed)`: Returns initialized RTS base, starting minerals, workers, and battlefield lane.
  - `legalActions(state)`: Produces array of currently valid production and maneuver orders.
  - `step(state, action)`: Applies player command and advances simulation tick. Returns `{ reward, done }`.
  - `isOver(state)`: Returns whether victory, defeat, or time limit has occurred.
  - `score(state)`: Evaluates base survival, enemy damage dealt, and military power.
