# 0173-combat-racing: Nitro Carnage

A high-speed vehicular combat racer inspired by *Twisted Metal*, *WipEout*, and *Death Rally*. Armed vehicles battle along a post-apocalyptic super-highway across three lanes, evading road hazards, exchanging kinetic vulcan cannon fire, launching heat-seeking missiles, deploying slick oil traps, and burning nitrous boost to reach the 100km checkered flag in first place.

## Core Pillars & Mechanics

- **Vehicular Vitals & Weapons Arsenal**:
  - `hull`: Armored vehicle integrity (0-100%). Sinks from incoming missile strikes and enemy rams; restored via repair nanites.
  - `nitro`: Nitrous oxide reserve (0-100%). Expended during boost surges.
  - `vulcanRounds`: High-caliber autocannon ammunition.
  - `homingMissiles`: Armor-piercing explosive rockets.
  - `oilSlicks`: Defensive rear-deployed countermeasures.
  - `lane`: 0 (Left), 1 (Center), 2 (Right).
  - `raceDistance`: Current track distance (0 to 100km).
- **Rival Combatants**:
  - Roster of rival racers (Scrap Raider, Iron Juggernaut, Nitro Viper).
  - Each rival has HP, speed, and telegraphed attacks (machinegun burst, ram, or mine drop).
- **Combat Maneuvers & Actions**:
  - `action:shift_lane:left`: Swerves vehicle left (-1 lane).
  - `action:shift_lane:right`: Swerves vehicle right (+1 lane).
  - `action:fire_vulcan_cannon`: Rapid kinetic burst at current lane rival (-2 vulcan rounds).
  - `action:launch_homing_missile`: Locks and launches explosive rocket (-1 missile, high damage).
  - `action:burn_nitro_boost`: Fires nitrous afterburners (+2x speed surge, -20 nitro).
  - `action:deploy_oil_slick`: Drops oil slick behind (-1 slick, spins out tailgaters).
  - `action:repair_armor_nanites`: Activates emergency chassis welding (+30 hull).
  - `action:cruise_forward`: Maintains top speed and collects roadside ammo crates.
- **Victory & Defeat**:
  - Victory: Cross 100km finish line with hull intact and at least 2 rival wrecks confirmed.
  - Defeat: Hull drops to 0 (wrecked) or turns reach maxTurns (120).

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-120)
- `maxTurns`: 120
- `lane`: integer (0-2)
- `hull`: integer (100)
- `nitro`: integer (80)
- `vulcanRounds`: integer (20)
- `homingMissiles`: integer (4)
- `oilSlicks`: integer (2)
- `raceDistance`: integer (0-100)
- `rival`: object or null (name, hp, maxHp, lane, dist)
- `rivalsWrecked`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
