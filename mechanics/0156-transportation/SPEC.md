# 0156-transportation: Transit Flow

A regional logistics and multimodal transportation network simulation. Players act as Chief Logistics Director, laying rail tracks and express highways, managing freight train fleets and delivery trucks, routing supply chains between urban and industrial hubs, and clearing regional bottlenecks to fulfill transport contracts.

## Core Pillars & Mechanics

- **Logistics Hubs & Regional Nodes**:
  - `Metro Center`: Urban hub demanding agricultural goods and consumer freight.
  - `Harbor Port`: Coastal terminal shipping export steel and receiving imported containers.
  - `Industrial District`: Smelting plants and heavy manufacturing complexes.
  - `Agricultural Valley`: Farms, grain silos, and livestock distribution centers.
  - `Airport Terminal`: High-priority express cargo hub connecting international flight lines.
- **Fleet & Infrastructure Vitals**:
  - `capital`: Operating balance ($). Earned upon timely freight delivery; spent laying infrastructure and acquiring vehicles.
  - `reputation`: Public logistics rating (0-100%). Elevated by on-time fulfillment; degraded by contract expirations.
  - `congestion`: Network traffic bottleneck index (0-100%). Rising traffic stalls routes. Reaching 100 triggers metropolitan gridlock!
  - `fuel`: Bulk diesel and electric power reserves (units). Expended during transport runs.
  - `fleet`:
    - `trains`: High-capacity heavy rail cargo haulers.
    - `trucks`: Nimble road freight vehicles.
- **Logistics Operations & Actions**:
  - `action:build_rail_corridor`: Lays inter-hub heavy rail connections (-$120, enables rail transport).
  - `action:pave_road_highway`: Paves high-speed asphalt corridors (-$80, enables road dispatch).
  - `action:purchase_freight_train`: Purchases an additional heavy train (-$150, +4 cargo capacity).
  - `action:purchase_cargo_truck`: Purchases delivery trucks (-$75, +2 cargo capacity).
  - `action:refuel_fleet`: Restocks diesel fuel tanks (-$50, +45 fuel).
  - `action:optimize_traffic_signals`: Upgrades dispatch AI, reducing network congestion by 25%.
  - `action:fulfill_contract:<contractId>`: Dispatches dedicated transport fleet to deliver cargo, collecting revenue.
- **Victory & Defeat**:
  - Victory: Fulfill at least 12 logistics contracts with >= 85% Reputation and >= $3,000 Capital.
  - Defeat: Bankruptcy (capital drops below -$100), total gridlock (congestion reaches 100%), or 5 failed contract deadlines.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `capital`: integer (starts at 500)
- `reputation`: integer (starts at 75)
- `congestion`: integer (0 to 100)
- `fuel`: integer (starts at 70)
- `fleet`: object
  - `trains`: integer
  - `trucks`: integer
  - `capacity`: integer
- `connections`: object
  - `rail`: array of strings
  - `road`: array of strings
- `contracts`: array of objects
  - `id`: string
  - `from`: string
  - `to`: string
  - `cargo`: string
  - `amount`: integer
  - `deadlineTurns`: integer
  - `reward`: integer
- `nextContractId`: integer
- `contractsCompleted`: integer
- `contractsFailed`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
