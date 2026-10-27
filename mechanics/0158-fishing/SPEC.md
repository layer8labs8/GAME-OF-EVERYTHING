# 0158-fishing: Ocean Trawler

A nautical commercial fishing and open-sea angling simulation inspired by Dredge and Fishing: Barents Sea. Players captain a sturdy commercial fishing trawler exploring four oceanic zones (Shallow Estuary, Coastal Reef, Continental Shelf, and Abyssal Trench), managing marine diesel, hull seaworthiness, fish sonar, bait supplies, refrigerated holds, and auctioning catches at Port Haven.

## Core Pillars & Mechanics

- **Oceanic Zones & Marine Depth**:
  - `0: Port Haven & Shallow Estuary`: Mackerel ($25) and Sea Trout ($45). Low risk, calm water.
  - `1: Coastal Reef`: Red Snapper ($80) and Black Sea Bass ($110). Moderate currents.
  - `2: Continental Shelf`: Bluefin Tuna ($220) and Swordfish ($320). Heavy pelagic runs.
  - `3: Abyssal Trench`: Giant King Crab ($450) and Legendary Coelacanth ($900). High reward, rogue squalls.
- **Trawler Telemetry & Storage**:
  - `hull`: Vessel hull seaworthiness (0-100%). Sinks if breaches occur; repaired at harbor drydock.
  - `fuel`: Marine diesel capacity (0-100 units). Expended navigating between zones and dragging trawler nets.
  - `bait`: Live squid and chum pots (units). Used for targeted angling casts.
  - `sonarCharge`: Active transducer battery (0-100%). Pings highlight high-grade trophy schools.
  - `cargoHold`: Fish inventory boxes vs `cargoCapacity`.
  - `hasFreezer`: Refrigeration upgrade preserving maximum auction freshness (+20% market value).
  - `money`: Operating capital ($).
- **Maritime Operations & Actions**:
  - `action:cast_fishing_line`: Casts rod and baited hook into current zone (-1 bait, -4 fuel, catches fish).
  - `action:deploy_trawl_net`: Drags heavy nylon nets through current pelagic zone (-14 fuel, catches 2 fish).
  - `action:ping_sonar_scanner`: Activates echo-sounder (-15 sonar, guarantees next catch is high-grade trophy).
  - `action:sail_to_zone:<zoneId>`: Steers trawler between ocean sectors (-8 to 14 fuel).
  - `action:dock_and_auction_catch`: Docks at Port Haven market, unloads all fish for market revenue, clears livewell.
  - `action:refuel_and_repair`: Drydock maintenance (+45 fuel, +35 hull) for $60.
  - `action:restock_bait_pots`: Purchases squid bait pots (+4 bait) for $35.
  - `action:install_flash_freezer`: Installs onboard cryo-freezer (-$180, +20% catch value).
  - `action:expand_livewell_capacity`: Expands fish hold by +4 crates (-$120).
- **Victory & Defeat**:
  - Victory: Capture the Legendary Abyssal Coelacanth in Zone 3, complete at least 6 port delivery auctions, and accumulate >= $3,500 Market Funds.
  - Defeat: Hull breaches and vessel sinks (hull reaches 0) or boat left adrift with zero fuel at sea.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `currentZone`: integer (0 to 3)
- `hull`: integer (starts at 100)
- `fuel`: integer (starts at 80)
- `bait`: integer (starts at 6)
- `sonarCharge`: integer (starts at 100)
- `money`: integer (starts at 240)
- `cargoCapacity`: integer (starts at 6)
- `hasFreezer`: boolean (starts at false)
- `sonarBonusActive`: boolean (starts at false)
- `cargo`: object
  - `mackerel`: integer
  - `snapper`: integer
  - `tuna`: integer
  - `coelacanth`: integer
- `legendaryCaught`: boolean
- `portDeliveries`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
