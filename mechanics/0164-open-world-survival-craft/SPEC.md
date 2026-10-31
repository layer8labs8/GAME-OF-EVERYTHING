# 0164-open-world-survival-craft: Wilderness Craft

An expansive open-world survival crafting simulation. Players are cast upon an uncharted primordial archipelago across four biomes, harvesting natural raw materials, crafting essential survival tools and fortified workstations, hunting wildlife, managing metabolic vitals, and assembling an extraction signal beacon atop the ancient ruins.

## Core Pillars & Mechanics

- **Metabolic Vitals & Stamina Management**:
  - `health`: Physical condition (0-100%). Sinks from predator attacks, hypothermia, dehydration, or starvation.
  - `hunger`: Satiation level (0-100%). Decays each turn; reaching 0 inflicts starvation damage. Restored with cooked rations.
  - `thirst`: Hydration level (0-100%). Decays each turn; reaching 0 inflicts dehydration damage. Restored by drinking purified fresh water.
  - `stamina`: Energy pool (0-100%). Expended during harvesting, hunting, and mining; restored by resting at shelter or drinking water.
- **Biomes & Exploration**:
  - `0: Coastal Beach`: Plentiful flint, driftwood, shellfish, and seawater.
  - `1: Pine Forest`: Rich timber groves, wild game, berry fiber.
  - `2: Granite Mountain Ridge`: Iron ore veins, stone quarries, predatory wolves.
  - `3: Ancient Ruins`: High plateau, mystical relics, site for building the extraction signal beacon.
- **Resource Economy & Crafting Tiers**:
  - Raw Materials: `wood`, `stone`, `fiber`, `ironOre`, `rawMeat`, `purifiedWater`.
  - Processed Goods: `ironIngots`, `cookedRations`.
  - Structures & Upgrades:
    - `workbench`: Unlocks advanced architectural and metallurgical recipes.
    - `campfire`: Unlocks meat roasting and boiling seawater into purified water.
    - `shelter`: Provides rest sanctuary, insulating against night freezes and nocturnal predators.
    - `smelter`: Converts iron ore + wood fuel into iron ingots.
    - `signalBeacon`: Extraction radio antenna erected at the Ancient Ruins to signal rescue.
- **Tactical Actions**:
  - `action:gather_fiber_and_flint`: Scavenge ground materials (+3 fiber, +2 flint).
  - `action:chop_trees`: Harvest wood (-15 stamina, +5 wood).
  - `action:mine_rock_and_ore`: Quarry stone or iron ore (-20 stamina, +4 stone / +2 iron ore if high tier).
  - `action:hunt_wildlife`: Stalk game (-20 stamina, yields raw meat & leather, potential beast counterattack).
  - `action:cook_rations`: Roast raw meat over campfire (+cooked rations).
  - `action:purify_water`: Boil water over campfire (+purified water).
  - `action:drink_water`: Hydrate (+40 thirst, +15 stamina).
  - `action:eat_cooked_ration`: Sate hunger (+40 hunger, +25 health).
  - `action:craft_structure:<structure>`: workbench, campfire, shelter, smelter, signalBeacon.
  - `action:upgrade_tools_to_iron`: Forges iron axe & pickaxe (boosts harvest yields).
  - `action:smelt_iron`: Smelt iron ore into iron ingots at smelter.
  - `action:rest_at_shelter`: Sleep safe overnight (+60 stamina, +15 health, avoids predators).
  - `action:travel_to_biome:<biomeId>`: Migrate between interconnected biomes.
  - `action:escape_wilderness`: Trigger rescue beacon for Victory!
- **Victory & Defeat**:
  - Victory: Travel to Biome 3 (Ancient Ruins), erect the `signalBeacon`, and execute `action:escape_wilderness`.
  - Defeat: Health drops to 0 or turns reach maxTurns (120).

## Pure Bot Contract
- Deterministic, zero DOM, pure state machine.
- Seedable PRNG.
- Legal actions never empty while game is active.
