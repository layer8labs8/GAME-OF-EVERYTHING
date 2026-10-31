# 0140-simulation: Biosphere Genesis

A planetary terraforming and ecological simulation. Players regulate atmospheric equilibria (Temperature, Oxygen, Moisture, Carbon Dioxide), deploy terraforming catalysts (comet impacts, cyanobacteria seeding, volcanic thermal vents, orbital sunshades), evolve life stages from barren rock to complex terrestrial biospheres, and stabilize a self-sustaining planetary paradise.

## Core Pillars & Mechanics

- **Atmospheric & Ecological State**:
  - `temperature`: Current global surface temperature in °C (Optimal Golden Zone: 15°C to 25°C).
  - `oxygen`: Atmospheric percentage (Optimal Golden Zone: 18% to 24%).
  - `moisture`: Surface humidity and ocean coverage percentage (Optimal Golden Zone: 40% to 70%).
  - `co2`: Greenhouse gas concentration percentage.
  - `biomass`: Ecological density index (0 to 100).
  - `epoch`: Current evolutionary epoch (100,000 years per turn).
  - `lifeStage`:
    - 0: `Barren Crust`
    - 1: `Primordial Microbes` (Cyanobacteria active)
    - 2: `Lichen & Sylvan Flora` (Photosynthesis active)
    - 3: `Terrestrial Ecosystem` (Fauna introduced)
    - 4: `Thriving Biosphere` (Self-sustaining planetary paradise)
- **Terraforming Interventions**:
  - `action:deploy_comet_ice`: Delivers extraterrestrial ice (+15% Moisture, +5% CO2, -3°C Temperature).
  - `action:seed_cyanobacteria`: Converts atmospheric CO2 into Oxygen (+5% O2, -8% CO2, +2°C).
  - `action:ignite_thermal_vents`: Taps geothermal mantle, releasing greenhouse warmth (+8°C, +8% CO2).
  - `action:seed_flora`: Cultivates continental forests once Moisture >= 30% and Temp >= 0°C (+8% O2, +15 Biomass).
  - `action:introduce_fauna`: Introduces herbivore and predator species once O2 >= 15% and Flora established (+20 Biomass).
  - `action:orbital_sunshade`: Deploys orbital refractive mirrors to mitigate runaway overheating (-6°C).
  - `action:advance_epoch`: Simulates 1 planetary cycle, applying climate feedback loops.
- **Victory & Defeat**:
  - Victory: Attain Stage 4 (`Thriving Biosphere`) with all atmospheric parameters in the Golden Zone and sustain stability for 3 epochs.
  - Defeat: Complete planetary desiccation or reaching 150 turns without achieving biospheric stability.

## State Schema
- `seed`: integer
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `epoch`: integer
- `temperature`: number (°C)
- `oxygen`: number (%)
- `moisture`: number (%)
- `co2`: number (%)
- `biomass`: number (0 to 100)
- `lifeStage`: integer (0 to 4)
- `stableEpochs`: integer (target: 3)
- `energy`: integer (intervention power, regenerated per epoch)
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized planetary simulation state.
- `legalActions(state)`: Returns non-empty list of available atmospheric interventions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns simulation completion flag.
- `score(state)`: Evaluates ecological simulation score.
