# 0095-turn-based-strategy: Empire & Hexes (Turn-Based Strategy)

A classic 4X-lite turn-based strategy (TBS) empire builder played across a 6x6 hexagonal grid map with city production queues, terrain defense modifiers, unit movement allowances, tactical counter-attacks, and capital city conquest.

## Core Rules & Features
- **6x6 Grid Battlefield & Terrain**:
  - Plains: Standard open ground (Move cost 1).
  - Hills: Fortified defensive ground (+25% defense bonus, Move cost 2).
  - Forests: Natural concealment (+15% defense bonus, Move cost 1).
  - Mountains: Impassable jagged peaks.
- **Cities & Settlements**:
  - **Player Capital (Valenhold at 1, 1)**: Generates 5 Gold and 8 Production per turn.
  - **Enemy Capital (Khorad at 4, 4)**: Opposing sovereign citadel.
  - **Neutral Trade City (Oasis at 2, 3)**: Strategic crossroad providing +4 Gold and +4 Production to occupier.
- **Military Battalions**:
  - **Swordsmen (Warrior)**: 50 HP, 25 Melee Attack, 2 MP (Costs 30 Production).
  - **Bowmen (Archer)**: 35 HP, 20 Ranged Attack (Range 2, ignores counter-attack), 2 MP (Costs 40 Production).
  - **Cavalry (Knight)**: 60 HP, 30 Attack, 3 MP (Costs 60 Production).
- **Tactical Commands (Actions)**:
  - `move:{unitId}:{r},{c}`: Traverse grid within remaining Movement Points (MP).
  - `attack:{unitId}:{targetId}`: Strike enemy within attack range. Melee attacks trigger defender counter-attacks unless target is destroyed.
  - `produce:{cityId}:{unitType}`: Queue city production for Swordsman, Archer, or Knight.
  - `rush_unit:{cityId}:{unitType}`: Instantly muster unit by expending 50 gold.
  - `end_turn`: Collects revenues, completes city production, refreshes unit MP, and executes Enemy AI turns.
- **Victory & Defeat**:
  - **Total Conquest Victory**: Capturing the Enemy Capital (Khorad).
  - **Dominion Victory**: Controlling all 3 cities simultaneously.
  - **Defeat**: Losing the Player Capital (Valenhold).
  - **Timeout (35 Turns)**: Resolved by city count, military strength, and treasury.
- **Bot Contract**:
  - `createState(seed)`: Generates terrain grid, city positions, starting garrisons, and treasuries.
  - `legalActions(state)`: Returns array of valid maneuvers (`move:*`, `attack:*`, `produce:*`, `rush_unit:*`, `end_turn`).
  - `step(state, action)`: Pure deterministic execution, battle calculation, AI logic. Returns `{ reward, done }`.
  - `isOver(state)`: Checks city conquest or turn threshold.
  - `score(state)`: Evaluates cities held, units fielded, enemy kills, and victory bonus.
