# 0142-resource-management: Star Foundry

A sci-fi industrial resource management and logistics simulation. Players oversee an orbital manufacturing platform, orchestrating supply chains across raw asteroid harvesting (Ore, Gas), advanced industrial refining (Alloys, Polymers, Circuits), energy grid infrastructure (Solar Arrays), and fulfilling lucrative galactic trade quotas.

## Core Pillars & Mechanics

- **Resource Supply Chains**:
  - `Raw Materials`:
    - `Ore`: Excavated from orbital asteroids by Mining Drills (+2 Ore/turn per drill).
    - `Gas`: Extracted from nebula pockets by Gas Extractors (+2 Gas/turn per extractor).
  - `Processed Goods`:
    - `Alloys`: Smelted in Foundries (Consumes 2 Ore + 1 Energy -> Produces 1 Alloy).
    - `Polymers`: Refined in Chemical Plants (Consumes 2 Gas + 1 Energy -> Produces 1 Polymer).
    - `Circuits`: Fabricated in Tech Assembly (Consumes 1 Alloy + 1 Polymer + 2 Energy -> Produces 1 Circuit).
- **Energy Infrastructure**:
  - Facilities consume electrical power each production cycle:
    - Drill: 1 MW | Extractor: 1 MW | Smelter: 1 MW | Refinery: 1 MW | Fabricator: 2 MW.
  - Solar Arrays generate +4 MW clean energy per unit.
  - If energy demand exceeds supply (`powerDeficit`), industrial throughput throttles proportionally.
- **Contract Fulfillment & Logistics Loop**:
  - `action:build_miner`: Construct mining drill ($100).
  - `action:build_extractor`: Construct gas extraction rig ($100).
  - `action:build_smelter`: Construct alloy foundry furnace ($150).
  - `action:build_refinery`: Construct chemical polymer refinery ($150).
  - `action:build_fabricator`: Construct circuit fabricator ($220).
  - `action:build_solar`: Construct orbital solar collector ($120).
  - `action:cycle_logistics`: Execute industrial pipeline production cycle, consuming inputs and producing outputs.
  - `action:fulfill_contract`: Deliver completed manufactured goods quota to galactic commerce, earning credits and reputation.
- **Victory & Defeat**:
  - Victory: Fulfill 6 galactic supply contracts and amass >= $4,000 Credits.
  - Defeat: Bankruptcy (credits fall below -$400) or turn limit reached without quota completion.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `cycle`: integer (manufacturing day/cycle)
- `credits`: integer (starting $500)
- `contractsCompleted`: integer
- `resources`: object
  - `ore`: integer
  - `gas`: integer
  - `alloy`: integer
  - `polymer`: integer
  - `circuit`: integer
- `facilities`: object
  - `miners`: integer
  - `extractors`: integer
  - `smelters`: integer
  - `refineries`: integer
  - `fabricators`: integer
  - `solar`: integer
- `currentContract`: object
  - `id`: integer
  - `targetAlloy`: integer
  - `targetPolymer`: integer
  - `targetCircuit`: integer
  - `rewardCredits`: integer
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized resource management state.
- `legalActions(state)`: Returns non-empty list of available industrial and logistics directives.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean simulation completion flag.
- `score(state)`: Evaluates industrial efficiency score.
