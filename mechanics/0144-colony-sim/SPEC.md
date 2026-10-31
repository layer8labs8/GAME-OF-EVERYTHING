# 0144-colony-sim: Aegis Outpost

A survival colony simulation. Players manage the life support, habitat infrastructure, resource reserves, and emotional wellbeing of frontier colonists striving to build a self-sustaining civilization on a hostile lunar exoplanet.

## Core Pillars & Mechanics

- **Colonist Survival & Welfare**:
  - `colonists`: Active pioneer population (starts at 4).
  - `morale`: Psychological index (0-100%). High morale boosts resource yields; low morale causes mental breaks.
  - `health`: Physical wellness index (0-100%). Depleted life support or exposure to planetary hazards reduces health.
- **Life Support Systems & Consumption**:
  - Daily consumption per colonist: 1 Ration, 1 Water, 1 Oxygen.
  - Shortages trigger severe health and morale penalties.
- **Colony Infrastructure**:
  - `biodomes`: Cultivates hydroponic crops (+4 Rations per cycle). Cost: 30 Scrap, 15 Components.
  - `scrubbers`: Synthesizes breathable atmosphere (+4 Oxygen per cycle). Cost: 25 Scrap, 10 Components.
  - `condensers`: Extracts subterranean moisture (+4 Water per cycle). Cost: 25 Scrap, 10 Components.
  - `reactors`: Supplies geothermal electricity (+6 Energy per cycle). Cost: 40 Scrap, 20 Components.
  - `quarters`: Habitat modules (+2 Colonist capacity). Cost: 35 Scrap, 10 Components.
- **Frontier Operations & Actions**:
  - `action:build_biodome`: Construct hydroponics facility.
  - `action:build_scrubber`: Construct atmospheric scrubber.
  - `action:build_condenser`: Construct moisture condenser.
  - `action:build_reactor`: Construct geothermal power reactor.
  - `action:build_quarters`: Construct crew living quarters.
  - `action:scavenge_surface`: Dispatch rover crew to harvest surface Scrap and Components.
  - `action:treat_colonists`: Administer medical triage (+20% Health, +10% Morale). Cost: 10 Scrap, 5 Components.
  - `action:advance_day`: Concludes the planetary sol, runs life support consumption, resolves environmental events, and admits colony immigrants.
- **Victory & Defeat**:
  - Victory: Sustain 12 or more colonists with >= 80% Morale through Day 25.
  - Defeat: Colony extinction (0 colonists, Health <= 0, or Morale <= 0).
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `day`: integer (sol number)
- `colonists`: integer (starting 4)
- `maxCapacity`: integer (starting 6)
- `health`: integer (0 to 100)
- `morale`: integer (0 to 100)
- `resources`: object
  - `rations`: integer (food)
  - `water`: integer
  - `oxygen`: integer
  - `energy`: integer
  - `scrap`: integer
  - `components`: integer
- `facilities`: object
  - `biodomes`: integer
  - `scrubbers`: integer
  - `condensers`: integer
  - `reactors`: integer
  - `quarters`: integer
- `event`: string (e.g. "Calm Sol", "Solar Flare", "Cold Snap")
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized colony simulation state.
- `legalActions(state)`: Returns non-empty list of available logistical, engineering, and survival directives.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean simulation completion flag.
- `score(state)`: Evaluates colony efficiency and survival score.
