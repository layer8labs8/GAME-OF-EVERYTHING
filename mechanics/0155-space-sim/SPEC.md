# 0155-space-sim: Void Navigator

An orbital navigation and deep-space pilot simulation. Players command an exploration vessel navigating celestial bodies, managing Newtonian delta-v burns, deflector shield power distribution, planetary surface scanning, orbital station docking, and asteroid mining to reach the distant Galactic Gateway.

## Core Pillars & Mechanics

- **Spacecraft Telemetry & Vitals**:
  - `hull`: Structural armor integrity (0-100%). Sinks upon micrometeorite strikes or solar flares. Reaching 0 triggers ship destruction!
  - `shields`: Deflector shield field (0-100%). Absorbs kinetic impacts and radiation before hull is breached.
  - `fuel`: Hydrazine reaction propellant (0-100 units). Expended during orbital burns and hyperspace transits.
  - `power`: Capacitor charge (0-100%). Used to power sensors, recharge shields, and operate mining drones.
  - `credits`: Galactic Credits ($) earned by selling gathered planetary scans and refined asteroid minerals.
  - `scienceData`: Accumulated sensor research packets.
  - `orbitSector`: Current navigation locus:
    - `0: Orbital Station (Terra Prime)`
    - `1: Inner Asteroid Belt`
    - `2: Gas Giant Haven (Titan Orbit)`
    - `3: Deep Kuiper Void`
    - `4: Galactic Gateway`
- **Flight & Avionics Directives**:
  - `action:prograde_burn`: Fires main thruster assembly to advance toward next celestial sector (-12 fuel, -5 power).
  - `action:retrograde_burn`: Decelerates spacecraft into stable parking orbit (-8 fuel, restores flight stability).
  - `action:recharge_shields`: Diverts auxiliary reactor power to recharge deflector shields (+30 shields, -15 power).
  - `action:scan_planetary_anomaly`: Activates deep-spectrum sensor array (+25 science data, +60 credits, -10 power).
  - `action:deploy_mining_drone`: Mines mineral-rich asteroids for volatiles and fuel (+18 fuel, +40 credits, -12 power).
  - `action:dock_with_station`: Docks at orbital station to execute hull repairs, refuel, and offload data.
  - `action:solar_charge`: Deploys solar panel sails to replenish ship capacitor (+35 power).
  - `action:hyperjump`: Initiates FTL jump to distant sectors when fuel and navigation criteria are met.
- **Victory & Defeat**:
  - Victory: Reach Sector 4 (Galactic Gateway), perform orbital alignment scan, and hold at least 2,000 Credits and 150 Science Data.
  - Defeat: Hull destroyed (hull reaches 0) or stranded in deep space without fuel and without power to maneuver.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `hull`: integer (0 to 100)
- `shields`: integer (0 to 100)
- `fuel`: integer (0 to 100)
- `power`: integer (0 to 100)
- `credits`: integer
- `scienceData`: integer
- `sector`: integer (0 to 4)
- `docked`: boolean
- `surveysCompleted`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
