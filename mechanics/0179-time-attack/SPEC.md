# 0179-time-attack: Speed Chrono

A precision circuit time-attack racing simulation where every millisecond counts. Players pilot a prototype electric hypercar across a technical Grand Prix circuit divided into five demanding sectors (Chicane, Sweeper, Hairpin, DRS Straight, and S-Curves), managing apex braking, racing line positioning, tire thermal degradation, and energy boost to beat the Gold Ghost lap record.

## Core Pillars & Mechanics

- **Circuit Sectors & Corner Geometry**:
  - Sector 1: `S-Chicane` (0 to 300m) - Target speed 140 km/h, alternating left-right line.
  - Sector 2: `Speed Sweeper` (300 to 650m) - Target speed 220 km/h, outer line entry.
  - Sector 3: `Monaco Hairpin` (650 to 950m) - Target speed 80 km/h, tight inside apex.
  - Sector 4: `DRS Straightaway` (950 to 1250m) - Maximum speed 280+ km/h, boost utilization.
  - Sector 5: `Final Chicane & Line` (1250 to 1500m) - Target speed 120 km/h, technical braking into finish.
- **Lap Telemetry & Chrono Delta**:
  - `timeElapsed`: Measured in tenths of a second (deciseconds). Target Gold record: <= 650 ds (65.0s).
  - `delta`: Comparison against the Gold Ghost split at each sector checkpoint (e.g. -1.2s ahead, +0.8s behind).
  - `speed`: (40 to 320 km/h).
  - `line`: Racing line (-100 to +100). Hitting the apex within ±15 of ideal line grants apex bonus and shaves lap time.
  - `tireHeat`: (0 to 100°C). Optimal grip is 50-80°C. >90°C causes thermal slip and understeer.
  - `boost`: (0 to 100%). Restored at sector checkpoints (+25%).
- **Driving Actions**:
  - `action:throttle_accelerate`: Full electric motor throttle (+speed, +tire heat).
  - `action:apex_brake`: Regenerative and carbon-ceramic braking (-speed, stabilizes line).
  - `action:steer_inside_curb`: Tightens racing line toward inside apex (-25 line).
  - `action:steer_outside_line`: Opens racing line wide (+25 line).
  - `action:boost_overdrive`: Consumes 25% boost for blistering instantaneous acceleration (+45 km/h).
  - `action:maintain_coasting`: Smooth throttle feathering to stabilize tire heat and maintain momentum.
- **Victory & Defeat**:
  - Victory: Cross 1,500m finish line beating the Gold Lap Record (<= 650 deciseconds).
  - Defeat: Wall barrier collision (|line| >= 95 at speed > 180 km/h) or lap time exceeding 800 deciseconds / maxTurns 80.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-80)
- `maxTurns`: 80
- `distance`: integer (0-1500m)
- `speed`: integer (40-320 km/h)
- `timeElapsed`: integer (deciseconds)
- `targetLapTime`: 650
- `sector`: integer (1-5)
- `line`: integer (-100 to 100)
- `tireHeat`: integer (0-100)
- `boost`: integer (0-100%)
- `perfectApexCount`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
