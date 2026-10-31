# 0175-hill-climb-racing: Peak Climber

A 2D physics-based hill climbing simulation. Players drive a rugged 4x4 off-road jeep across steep, rolling, and treacherous mountainous terrain, balancing throttle, brake, pitch orientation, and fuel consumption to scale a 1,000m summit without flipping upside down.

## Core Pillars & Mechanics

- **2D Terrain & Physics Dynamics**:
  - Distance: 0 to 1,000m mountain peak.
  - Elevation Profile: Procedural rolling hills, steep inclines, and deep valleys calculated as a function of distance.
  - `pitchAngle`: Chassis angle in degrees (-90° to +90°). If the vehicle flips over (|pitchAngle| >= 85° upon landing/contact), a driver rollover crash occurs!
  - `velocity`: Forward drive speed (-5 to 25 m/s).
  - `airborne`: True when launching over steep crests; enables aerial flips and angle correction.
- **Resources & Upgrades**:
  - `fuel`: (0 to 100%). Drains per turn and while throttle is applied; replenished by collecting red fuel cans.
  - `coins`: Snatched along peaks; invested in garage upgrades.
  - Upgrades:
    - `engine`: Boosts forward torque and hill-climbing power.
    - `suspension`: Dampens landing shock and stabilizes pitch angle.
    - `tires`: Improves traction on steep muddy slopes.
- **Driving Actions**:
  - `action:gas_accelerate`: Applies throttle (+forward speed, pitches nose slightly up, -fuel).
  - `action:brake_reverse`: Applies brakes / reverse (-speed, pitches nose down).
  - `action:tilt_forward`: Corrects pitch forward (-15° angle).
  - `action:tilt_backward`: Corrects pitch backward (+15° angle).
  - `action:upgrade_vehicle:<type>`: Upgrades engine, suspension, or tires.
- **Victory & Defeat**:
  - Victory: Reach 1,000m summit peak without flipping over.
  - Defeat: Vehicle flips over (|pitchAngle| >= 85°), fuel runs out (0%), or turns reach maxTurns (120).

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-120)
- `maxTurns`: 120
- `distance`: integer (0-1000m)
- `velocity`: integer (0-25)
- `pitchAngle`: integer (-85 to 85)
- `fuel`: integer (100)
- `coins`: integer (starts at 20)
- `airborne`: boolean
- `upgrades`: object (engine, suspension, tires)
- `flipsCompleted`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
