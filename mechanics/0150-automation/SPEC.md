# 0150-automation: Conveyor Core

A factory automation and logistics simulation inspired by Factorio, Mindustry, and Shapez. Players design, expand, and balance an autonomous industrial grid featuring automated conveyor belts, mineral extractors, electric smelters, and robotic assemblers to manufacture complex micro-electronics and quantum processors.

## Core Pillars & Mechanics

- **Automated Processing Machinery**:
  - `Miners`: Automatically excavates raw Copper and Silicon (+2 Copper, +2 Silicon per cycle).
  - `Smelters`: Automatically refines raw materials into Copper Wire and Silicon Wafers (Consumes 2 Copper -> 2 Wire, 2 Silicon -> 2 Wafers).
  - `Assemblers`: Robotic fabricators that assemble Logic Gates (2 Wire + 1 Wafer -> 1 Logic Gate) and Quantum Processors (2 Gates + 2 Wafers -> 1 Quantum Processor).
  - `Generators`: Supplies electrical power (+5 kW per unit) required by machines.
  - `Conveyor Belts`: Determines logistics throughput multiplier (Level 1: 1.0x, Level 2: 1.5x, Level 3: 2.0x).
- **Industrial Grid Operations & Actions**:
  - `action:build_miner`: Install automated extraction drill ($80).
  - `action:build_smelter`: Construct automated electric induction smelter ($120).
  - `action:build_assembler`: Erect robotic component assembler ($180).
  - `action:upgrade_conveyors`: Upgrade conveyor belt throughput speed ($150).
  - `action:build_generator`: Expand industrial power plant ($100).
  - `action:export_goods`: Deliver stockpiled processors and gates to galactic market for credits and engineering prestige.
  - `action:cycle_factory`: Executes an automated factory production tick, advancing conveyor belts and running all machines.
- **Victory & Defeat**:
  - Victory: Export at least 15 Quantum Processors, reach Belt Level 3, and amass >= $3,500 in factory credits.
  - Defeat: Bankruptcy (credits fall below -$300) or operational deadline expiry.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `cycle`: integer (factory cycle count)
- `credits`: integer (starting $400)
- `beltLevel`: integer (starting 1)
- `powerGrid`: object { supply: 10, demand: 6 }
- `machines`: object { miners: 1, smelters: 1, assemblers: 1, generators: 2 }
- `items`: object { copper: 8, silicon: 8, wire: 2, wafers: 2, gates: 0, processors: 0 }
- `processorsExported`: integer
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized automation factory state.
- `legalActions(state)`: Returns non-empty list of available machinery, engineering, and logistics directives.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean simulation completion flag.
- `score(state)`: Evaluates automation efficiency score.
