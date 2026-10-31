# 0136-walking-simulator: Solitary Echoes

An atmospheric narrative exploration experience. Players embark on a contemplative journey across the mist-shrouded Isle of Orford, traversing coastal trails, abandoned homesteads, whispering pine groves, and cliffside overlooks to restore memory fragments and activate the abandoned Starlight Observatory.

## Core Pillars & Mechanics

- **Atmospheric Environmental Vistas**:
  - `coastal_trail`: Ocean waves crashing against black basalt cliffs; sea spray and distant foghorn.
  - `fisherman_cottage`: Weathered timber cabin holding a cassette player, dried lavender, and old postcards.
  - `whispering_groves`: Dense coastal pines where windchimes murmur forgotten voice recordings.
  - `cliffside_overlook`: High promontory equipped with scenic binoculars looking across the silent sea.
  - `starlight_observatory`: The mountain apex housing an antique brass refractor telescope and celestial dome.
- **Narrative Discovery & Contemplation**:
  - `walk:<destination>`: Move between adjacent scenic waypoints.
  - `inspect:<prop>`: Examine environmental objects (vintage cassette, lighthouse logbook, painted portrait, stone cairn).
  - `tune:radio`: Adjust handheld frequency to pick up ambient radio echoes from the past.
  - `contemplate:<subject>`: Reflect on narrative revelations, gaining peaceful clarity and emotional resonance.
  - `align:telescope`: Calibrate the observatory refractor once memory fragments are gathered.
- **Memory Fragments**:
  - Uncovering 4 key memories:
    - `memory_departure`: The day the lightkeeper left the island.
    - `memory_storm`: The night the Great Gale struck the western coast.
    - `memory_melody`: The lullaby played on the cottage upright piano.
    - `memory_constellation`: The lost coordinates of the Stella Maris nebula.
- **Victory & Conclusion**:
  - Victory: Collect all 4 memory fragments and align the Starlight Telescope to illuminate the beacon across the sea.
  - Bounded: Finite termination guaranteed at 150 turns.

## State Schema
- `seed`: integer
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `location`: string ('coastal_trail' | 'cottage' | 'groves' | 'overlook' | 'observatory')
- `discoveredMemories`: array of string IDs
- `inspectedProps`: object tracking examined props
- `radioFrequenciesFound`: integer
- `telescopeAligned`: boolean
- `clarity`: integer (emotional progression meter)
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `monologue`: array of poetic narrative lines

## Pure Bot Contract
- `createState(seed)`: Returns initialized walking journey state.
- `legalActions(state)`: Returns non-empty list of available paths, contemplations, and environmental interactions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns journey completion status.
- `score(state)`: Evaluates contemplative journey score.
