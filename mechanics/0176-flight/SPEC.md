# 0176-flight: Aero Ace

A high-stakes aerobatic flight simulator set in coastal airspace. Players pilot a high-performance turboprop aircraft through a challenging aerial obstacle course consisting of suspended sky rings across varying altitudes, managing airspeed, lift, throttle, bank angle, pitch trim, and landing gear to execute a textbook runway touchdown without stalling or crashing into the terrain.

## Core Pillars & Mechanics

- **Flight Dynamics & Aerodynamics**:
  - `altitude`: (0 to 5,000 ft). Ground level is 0 ft. Terrain contact without deployed landing gear or at excessive speed results in an immediate crash.
  - `airspeed`: (50 to 300 knots). Stall threshold is 80 knots. Below 80 knots, lift collapse causes rapid altitude descent.
  - `throttle`: (0% to 100%). Controls engine thrust and fuel burn rate.
  - `pitch`: (-30° nose-down dive to +30° nose-up climb). Climbing converts airspeed into altitude; diving converts altitude into airspeed.
  - `bank`: (-40° left bank to +40° right bank). Controls lateral heading alignment.
  - `landingGear`: boolean. Retracted reduces aerodynamic drag; deployed is mandatory for runway touchdown at altitude 0.
- **Aerial Ring Navigation**:
  - The flight course features 5 sequential sky rings suspended in the clouds:
    - Ring 1: 1,500 ft (heading 0°)
    - Ring 2: 2,500 ft (heading -15°)
    - Ring 3: 3,200 ft (heading +20°)
    - Ring 4: 2,000 ft (heading 0°)
    - Ring 5: 1,000 ft (heading -10°)
  - Passing through a ring awards 1,000 bonus points and refuels the aircraft by +25%.
- **Runway Touchdown & Landing**:
  - After navigating all 5 rings, the final sector is an approach to an island runway at 0 ft.
  - Safe Landing Criteria: Altitude 0 ft, landing gear deployed, pitch between -5° and +5°, bank between -5° and +5°, airspeed between 80 and 125 knots.
- **Actions**:
  - `action:throttle_increase`: Increases throttle by +20% (more thrust, higher fuel consumption).
  - `action:throttle_decrease`: Decreases throttle by -20% (lowers thrust, slows airspeed).
  - `action:pitch_up`: Pulls control stick back (+8° pitch up, trades airspeed for altitude).
  - `action:pitch_down`: Pushes control stick forward (-8° pitch down, dives, gains airspeed).
  - `action:bank_left`: Rolls aircraft left (-10° bank).
  - `action:bank_right`: Rolls aircraft right (+10° bank).
  - `action:level_wings`: Auto-trims pitch and bank back towards 0° horizon.
  - `action:toggle_landing_gear`: Deploys or retracts landing gear.
- **Victory & Defeat**:
  - Victory: Complete all 5 sky rings and execute a safe landing on the island runway.
  - Defeat: Terrain impact (altitude <= 0 outside safe landing parameters), fuel exhaustion, unrecoverable stall spin, or turns >= 100.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-100)
- `maxTurns`: 100
- `altitude`: integer (0-5000 ft)
- `airspeed`: integer (50-300 knots)
- `throttle`: integer (0-100%)
- `pitch`: integer (-30 to +30°)
- `bank`: integer (-40 to +40°)
- `fuel`: integer (0-100%)
- `landingGear`: boolean
- `currentRingIndex`: integer (0 to 5)
- `ringsPassed`: integer (0 to 5)
- `isStalling`: boolean
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
