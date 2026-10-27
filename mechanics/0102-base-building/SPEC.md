# 0102-base-building: Outpost Constructor

A strategic modular base-construction simulation where the player engineers an extraterrestrial frontier outpost, balancing power grid networks, mineral extraction, life-support domes, and automated perimeter defenses against hostile alien swarms and environmental hazards.

## Core Rules & Features
- **Outpost Sector Grid**:
  - 5x5 modular expansion zone with mineral veins, geothermal vents, and barren bedrock.
  - Central Command Core initialized at `(2, 2)` (provides baseline power, life support, and storage).
- **Buildable Infrastructure Modules**:
  - **Solar Array** (Cost: 20 Min): +12 Power generation during operational daylight.
  - **Mineral Drill** (Cost: 25 Min, Consumes: 3 Power): Extracts +10 Minerals per turn from adjacent mineral deposits.
  - **Hydroponic Biodome** (Cost: 30 Min, Consumes: 5 Power): Sustains +10 Colonists with food and oxygen.
  - **Laser Defense Turret** (Cost: 35 Min, Consumes: 6 Power): Automatically fires upon incoming hostile alien swarms and meteor hazards within range 2.
  - **Reactor Core** (Cost: 50 Min): High-density geothermal plant providing +35 Power.
  - **Power Conduit** (Cost: 5 Min): Links disconnected modules across the sector grid to the central power network.
  - **Orbital Uplink Beacon** (Cost: 80 Min, Consumes: 25 Power): The ultimate Tier-3 structure required to establish communication with Earth command.
- **Power Grid & Network Mechanics**:
  - Structures must be adjacent or connected via Power Conduits to the Command Core or Power Plants to receive electricity.
  - If Total Power Demand exceeds Total Power Supply, the base enters a Brownout state: turrets deactivate, life support fails, and modules suffer damage.
- **Environmental Hazards & Hostile Invasions**:
  - Every 5 turns, an alien swarm or meteor shower impacts the outpost.
  - Powered defense turrets intercept threats before they breach the perimeter. Unprotected modules take structural damage.
- **Victory & Defeat**:
  - **Mission Accomplished**: Successfully construct and power the Orbital Uplink Beacon and survive to Turn 20.
  - **Base Collapse**: Central Command Core destroyed or all colonists lost to life-support failure.
- **Bot Contract**:
  - `createState(seed)`: Generates sector terrain, deposits, starting resources, and command hub.
  - `legalActions(state)`: Returns valid building construction, repair, upgrade, and turn progression options.
  - `step(state, action)`: Applies building order, calculates power balances, advances environmental clock, returns `{ reward, done }`.
  - `isOver(state)`: Returns whether mission objectives or structural failures occurred.
  - `score(state)`: Evaluates base power capacity, operational modules built, threats neutralized, and surviving colonists.
