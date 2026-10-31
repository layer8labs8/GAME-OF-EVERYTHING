# 0157-mining: Subterranean Core

An industrial geological excavation and shaft mining simulation. Players command a heavy mechanized borehole drilling rig descending through geological strata (Shallow Clay, Sedimentary Bedrock, Volcanic Basalt, and Lithospheric Core), managing fuel, drill bit durability, shaft structural supports, cargo capacity, and mineral smelting at the surface depot.

## Core Pillars & Mechanics

- **Subterranean Strata & Geological Depth**:
  - `Shallow Silt & Clay (0m - 50m)`: Yields Coal and Copper ore.
  - `Sedimentary Bedrock (50m - 150m)`: Yields Iron and Silver veins.
  - `Volcanic Basalt (150m - 300m)`: Yields Gold nuggets and Titanium.
  - `Lithospheric Core (300m+)`: Yields Ancient Core Diamonds.
- **Drill Rig Telemetry & Resources**:
  - `depth`: Current meters subterranean (0m = surface).
  - `drillDurability`: Bit structural condition (0-100%). Sinks as hard rock is bored; repaired at the surface workshop.
  - `fuel`: Diesel / power capacity (0-100 units). Expended on drilling, extraction, and elevator hauls.
  - `shaftIntegrity`: Tunnel stability index (0-100%). Low integrity risks catastrophic cave-in collapse.
  - `cargo`: Mineral cargo inventory held in the rig hopper:
    - `coal`: $25 value
    - `copper`: $45 value
    - `iron`: $80 value
    - `gold`: $160 value
    - `diamonds`: $350 value
  - `cargoWeight`: Current sum of carried ores vs `cargoCapacity`.
  - `cash`: Operating capital ($).
- **Mining Operations & Actions**:
  - `action:drill_downward`: Drives rotary cutting head deeper into the crust (-10 fuel, bores 25m deeper, collects strata ore, wears drill).
  - `action:extract_rich_vein`: Precision bores a concentrated mineral vein at current depth (-12 fuel, fills cargo).
  - `action:install_shaft_struts`: Installs timber and hydraulic steel supports (+30 shaft integrity, -$45).
  - `action:surface_haul_and_sell`: Takes the hoist elevator to surface depot, unloads all ores for market cash, and clears cargo hold.
  - `action:refuel_and_repair`: Replenishes diesel tanks (+45 fuel) and hones drill bit (+35 durability) at surface for $60.
  - `action:upgrade_drill_bit`: Upgrades cutting head to Tungsten Carbide or Diamond tip (-$200, reduces drill wear rate).
  - `action:expand_cargo_hopper`: Expands cart cargo volume by +4 tons (-$120).
- **Victory & Defeat**:
  - Victory: Bore into the Lithospheric Core (depth >= 350m), recover at least 3 Ancient Core Diamonds, and hold >= $3,500 Cash.
  - Defeat: Shaft cave-in (shaft integrity falls to 0), drill destroyed (durability reaches 0 at depth), or stranded without fuel while underground.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `depth`: integer (starts at 0)
- `drillDurability`: integer (starts at 100)
- `fuel`: integer (starts at 80)
- `shaftIntegrity`: integer (starts at 100)
- `cash`: integer (starts at 250)
- `cargoCapacity`: integer (starts at 6)
- `drillTier`: integer (starts at 1)
- `cargo`: object
  - `coal`: integer
  - `copper`: integer
  - `iron`: integer
  - `gold`: integer
  - `diamonds`: integer
- `diamondsRecovered`: integer
- `totalOreSold`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
