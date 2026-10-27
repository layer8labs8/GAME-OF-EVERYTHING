# 0104-trading: Merchant Guild

A Mediterranean and Silk Road naval merchant trading simulation where the player captains a trading fleet, navigating commodity arbitrage (spices, silk, fine cloth, armaments, grain), fending off Corsair pirates, and establishing trade posts across five historic ports.

## Core Rules & Features
- **Mediterranean Trade Route Ports**:
  - `venice`: Italian naval republic. Produces Fine Wine & Glass; high demand for Spices & Silk.
  - `alexandria`: Egyptian trade gateway. Produces Exotic Spices; high demand for Weapons & Cloth.
  - `constantinople`: Byzantine crossroad. Produces Imperial Silk & Incense; high demand for Grain & Timber.
  - `genoa`: Ligurian trade hub. Produces Armaments & Iron; high demand for Wine & Spices.
  - `ragusa`: Adriatic free port. Produces Timber & Grain; high demand for Armaments & Silk.
- **Commodity Arbitrage & Market Dynamics**:
  - 5 Commodities: `grain`, `wine`, `weapons`, `silk`, `spices`.
  - Local port supply and demand dictate prices. Buying consumes local supply and drives prices up; selling floods the market and depresses prices.
  - Profit is made by purchasing cheap in source ports and transporting across maritime trade routes to sell in high-demand markets.
- **Fleet Capacity & Maritime Hazards**:
  - Fleet begins as a Merchant Sloop: 20 Cargo Capacity, 50 Hull HP, 1 Cannon.
  - Can upgrade to Caravel (40 Cargo, 80 HP, 2 Cannons) and Grand Galleon (80 Cargo, 140 HP, 4 Cannons).
  - Sailing between ports risks Corsair pirate ambushes. Cannons and mercenary escorts return fire to protect cargo; unescorted ships suffer hull damage and cargo pillaging.
- **Trading Houses & Expansion**:
  - Players can construct a Guild Warehouse in visited ports ($350 cost) to earn a permanent 15% trade tariff discount and local storage.
- **Strategic Actions**:
  - `sail:{targetPort}`: Embarks on voyage to connected port, rolling for sea encounters (pirates, calm seas, fair winds).
  - `buy:{commodity}:{amount}`: Purchases goods in current port within gold reserves and remaining cargo space.
  - `sell:{commodity}:{amount}`: Liquidates cargo into local market at current port price.
  - `upgrade_fleet:{cargo|cannons|hull}`: Expands ship specifications.
  - `hire_escort`: Recruits mercenary warship to neutralize the next pirate encounter.
  - `build_warehouse:{port}`: Constructs permanent trading station.
- **Victory & Defeat**:
  - **Merchant Magnate**: Accumulate 4,000 Gold florins, command a Galleon, and establish 3 Guild Warehouses within 25 voyages.
  - **Shipwreck / Bankruptcy**: Flagship sunk (Hull <= 0) or stranded with zero cargo and less than 10 gold.
- **Bot Contract**:
  - `createState(seed)`: Initializes starting port (Venice), starting capital (300 Gold), Sloop stats, and port markets.
  - `legalActions(state)`: Returns valid trades, voyages, upgrades, and investments.
  - `step(state, action)`: Applies trade order, calculates voyage encounters, returns `{ reward, done }`.
  - `isOver(state)`: Evaluates terminal win/loss conditions.
  - `score(state)`: Evaluates total net worth, warehouses constructed, and trade profit accumulated.
