# 0080-tabletop: Tabletop Skirmish

A tactical turn-based miniature tabletop wargame played on a 7x7 battlefield grid with terrain, relic shrines, line-of-sight range, and deterministic D6 combat resolution.

## Core Rules & Features
- **Map & Terrain**: 7x7 grid containing open plains, defensive forests (+2 defense cover), impassable obsidian rocks, and two ancient Relic Shrines at pivotal strategic crossroads.
- **Squads & Miniatures**:
  - **Player Warband ("Solar Guard")**: Paladin (Melee tank), Ranger (Long-range sharpshooter), and Mage (High-damage arcane striker).
  - **Enemy Warband ("Void Legion")**: Shadow Knight, Void Archer, and Necromancer.
- **Action Economy**:
  - Each round provides 3 Action Points (AP).
  - Actions cost 1 AP:
    - `move:{unitId}:{r},{c}`: Traverse terrain within unit movement range.
    - `attack:{unitId}:{targetId}`: Strike enemy within attack range; damage computed via deterministic D6 roll + base attack minus defender cover.
    - `claim:{unitId}`: Capture an adjacent or occupied Relic Shrine to claim Victory Points.
    - `end_turn`: Pass remaining AP and begin AI counter-phase.
- **Objectives & Victory Conditions**:
  - Controlling Relic Shrines awards 2 Victory Points (VP) per round held.
  - Slaying an opposing miniature awards 5 VP.
  - First army to reach 25 Victory Points or completely eliminate all opposing forces wins.
- **Bot Contract**:
  - `createState(seed)`: Initializes deterministic battlefield grid, terrain layout, squad positioning, and action point pool.
  - `legalActions(state)`: Returns array of valid AP actions available to the player (`move:*`, `attack:*`, `claim:*`, `end_turn`).
  - `step(state, action)`: Applies player choice, updates AP/board/damage; when player round ends, automatically simulates AI warband turns. Returns `{ reward, done }`.
  - `isOver(state)`: Returns true if victory threshold (25 VP) reached, warband annihilated, or step limit reached.
  - `score(state)`: Player net Victory Points and battlefield dominance.
