# 0107-territory-capture: Sector Domination

A grand turn-based territorial conquest and frontline expansion simulator. Players command regional garrisons across a 5x5 strategic sector theater, deploying reinforcements, fortifying defensive bastions, and executing combined assaults to achieve territorial hegemony.

## Core Rules & Features
- **Theater Grid**:
  - 5x5 grid of 25 distinct territorial sectors (`r: 0..4, c: 0..4`).
  - Sector attributes:
    - `owner`: `'player'`, `'enemy'`, or `'neutral'`.
    - `troops`: Garrison strength (1 to 25).
    - `fort`: Bastion fortification tier (0 to 2, provides +40% / +80% defense multiplier).
    - `isSupplyDepot`: High-value logistical hubs providing +1 bonus reinforcement per turn held.
- **Turn Phases & Reinforcements**:
  - At the start of each turn, both sides receive reinforcements:
    - Base reserves: `Math.max(3, Math.floor(territoriesCount / 3)) + supplyDepotsHeld`.
  - Actions during turn:
    - `deploy:r,c`: Reinforces a friendly sector by transferring troops from reserve pool.
    - `attack:r1,c1->r2,c2`: Launches an offensive into an adjacent orthogonal sector. Leaves 1 troop to maintain garrison, advances `(troops - 1)`.
    - `fortify:r,c`: Converts 2 garrison troops into a permanent fortification tier.
    - `end_turn`: Concludes orders, executes enemy AI reinforcement and offensive operations.
- **Combat Resolution**:
  - Attacking power: `A = garrison - 1`.
  - Defensive strength: `D = defenderGarrison * (1 + fort * 0.4)`.
  - Outcome:
    - If `A > D`: Attacker wins, captures sector with remaining survivors `Math.max(1, Math.floor(A - D * 0.7))`.
    - If `A <= D`: Assault repelled, target defender reduced to `Math.max(1, Math.floor(D - A * 0.7))`.
- **Termination & Score**:
  - **Victory**: Eliminate all enemy sectors, or secure hegemony by controlling >= 18 sectors (72% of map).
  - **Defeat**: Player loses all sectors, or turn limit (`MAX_TURNS = 35`) expires without achieving hegemony.
  - **Score**: Sunk enemy casualties, total sectors controlled, supply depots secured, and turn efficiency bonus.
- **Bot Contract**:
  - `createState(seed)`: Initializes deterministic map layout, supply hubs, and balanced starting garrisons.
  - `legalActions(state)`: Returns valid deployments, adjacent assaults, fortification upgrades, and turn advancement.
  - `step(state, action)`: Applies tactical orders, runs enemy AI response, returns `{ reward, done }`.
  - `isOver(state)`: Returns boolean terminal state.
  - `score(state)`: Evaluates territorial dominance and military efficiency.
