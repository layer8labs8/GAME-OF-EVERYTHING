# 0159-hunting: Wilderness Stalker

A strategic big-game hunting and wilderness tracking simulation inspired by theHunter: Call of the Wild and Way of the Hunter. Players embark as a seasoned ranger navigating four wilderness elevations (Valley Marshes, Pine Ridges, Glacial Peaks, and Sacred Tundra), reading wind direction, utilizing binoculars and animal callers, masking scent, stalking into optimal rifle range, and taking clean vital shots to claim ethical trophies.

## Core Pillars & Mechanics

- **Wilderness Biomes & Game Species**:
  - `0: Valley Marshes`: Whitetail Buck ($120) and Wild Boar ($90). Dense brush, mild wind.
  - `1: Pine Forest Ridge`: Rocky Mountain Elk ($240) and Black Bear ($280). Steep terrain.
  - `2: Glacial Peaks`: Bighorn Sheep ($360) and Mountain Lion ($420). Thin air, high wind.
  - `3: Sacred Tundra`: Legendary Great White Moose ($1,200). Immense trophy crown, elusive.
- **Hunter Vitals & Ballistics**:
  - `stamina`: Physical endurance (0-100%). Expended during crawls and cross-biome treks; restored at hunting blinds.
  - `scentMask`: Windward concealment (0-100%). Low scent mask allows animals to detect hunter scent downwind.
  - `ammo`: High-caliber rifle rounds (.30-06 / .300 Win Mag).
  - `steadyAim`: Breath control and scope stability (0-100%). High aim ensures vital double-lung or heart shots.
  - `currentTarget`: Active tracked animal with `distanceMeters`, `alertLevel`, `species`, and `trophyRating`.
  - `funds`: Bounty cash ($) earned from ethical harvests, spent restocking ammunition and callers.
- **Tracking & Hunting Actions**:
  - `action:glass_with_binoculars`: Identifies animal herd at distance, locking onto a target.
  - `action:apply_scent_mask`: Coats hunter gear with natural pine musk (+35 scent concealment, -$25).
  - `action:use_animal_caller`: Lures tracked animal 30m closer (-5 stamina, requires target).
  - `action:crawl_stalk`: Low-profile crawl closer to animal (-12 stamina, reduces distance by 25m).
  - `action:steady_aim_and_fire`: Takes the vital shot through telescopic sight (-1 ammo). Accuracy depends on distance and steady aim.
  - `action:harvest_downed_game`: Claims downed animal, registers trophy score, and collects bounty payout.
  - `action:rest_at_blind`: Sets up hunting blind, resting campfire (+45 stamina, +30 steady aim).
  - `action:restock_supplies`: Buys rifle ammunition and caller scents at ranger cabin (-$50, +4 ammo).
  - `action:travel_to_biome:<biomeId>`: Treks between elevations (-15 stamina).
- **Victory & Defeat**:
  - Victory: Successfully harvest the Legendary Great White Moose in Biome 3 with Diamond rating, achieve at least 6 game harvests, and amass >= $3,200 Hunting Bounties.
  - Defeat: Spook 5 consecutive targets or exhaust all ammo and funds while stranded.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `biome`: integer (0 to 3)
- `stamina`: integer (starts at 100)
- `scentMask`: integer (starts at 80)
- `ammo`: integer (starts at 8)
- `steadyAim`: integer (starts at 90)
- `funds`: integer (starts at 300)
- `currentTarget`: object or null
  - `species`: string
  - `distance`: integer (meters)
  - `alert`: integer (0 to 100)
  - `trophyScore`: integer
  - `isDowned`: boolean
- `harvestCount`: integer
- `spookCount`: integer
- `legendaryClaimed`: boolean
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
