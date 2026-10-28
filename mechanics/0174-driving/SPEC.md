# 0174-driving: Highway Hauler

A realistic commercial transport and precision highway driving simulation inspired by *Euro Truck Simulator 2* and *American Truck Simulator*. Players captain an 18-wheel heavy freight semi-truck along a 100km interstate corridor, managing transmission gear ratios, throttle and service braking, fuel conservation, driver fatigue, highway traffic merges, and fragile high-value cargo integrity.

## Core Pillars & Mechanics

- **Heavy Transport Dynamics**:
  - `gear`: 1 (Low: 0-40 km/h, high torque), 2 (Mid: 30-80 km/h), 3 (High: 70-120 km/h cruise).
  - `speed`: Current road velocity (0 to 120 km/h).
  - `lane`: 0 (Slow / Right shoulder), 1 (Cruising lane), 2 (Passing lane).
  - `fuel`: Tank capacity (0-100 L). Burns per km driven; refueled at roadside service plazas.
  - `fatigue`: Driver exhaustion (0-100%). Rising fatigue induces micro-sleep hazards; reset by resting in the sleeper cab.
  - `cargoIntegrity`: (0-100%). Fragile electronics shipment; damaged by harsh emergency stops, speeding over bumps, or clipping civilian traffic.
  - `distance`: Route progress (0 to 100 km).
- **Highway Traffic & Hazards**:
  - Traffic flow ahead across all 3 lanes (slow utility vans, commuter sedans, road maintenance barriers).
- **Driving Actions**:
  - `action:accelerate_throttle`: Applies throttle, accelerating based on selected gear and consuming fuel.
  - `action:apply_service_brakes`: Decelerates truck safely (-30 km/h).
  - `action:shift_gear_up`: Steps transmission up (1 -> 2 -> 3).
  - `action:shift_gear_down`: Steps transmission down (3 -> 2 -> 1).
  - `action:shift_lane:left`: Merges truck into left lane (-1 lane).
  - `action:shift_lane:right`: Merges truck into right lane (+1 lane).
  - `action:stop_at_fuel_depot`: Pulls off at service plaza to replenish diesel tank to 100%.
  - `action:rest_sleeper_cab`: Parks at truck stop to sleep, resetting driver fatigue to 0%.
  - `action:deliver_freight`: Pulls into coastal container terminal to finalize delivery for Victory!
- **Victory & Defeat**:
  - Victory: Reach 100km terminal with cargoIntegrity >= 60% and execute `action:deliver_freight`.
  - Defeat: Running out of fuel (0L), fatigue hitting 100% (micro-sleep crash), cargo destroyed (integrity 0%), or reaching 120 turns.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-120)
- `maxTurns`: 120
- `gear`: integer (1-3)
- `speed`: integer (0-120)
- `lane`: integer (0-2)
- `fuel`: integer (100)
- `fatigue`: integer (0-100)
- `cargoIntegrity`: integer (100)
- `distance`: integer (0-100)
- `traffic`: array of objects (obstacles/vehicles ahead per lane)
- `contractsFulfilled`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
