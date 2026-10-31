# 0163-survival-horror: Shadow Descent

A tense atmospheric survival horror simulation. Players wake inside the quarantined subterranean Blackwood Research Complex, managing extreme resource scarcity, flashlight batteries, elevated heart rates and sanity decay, chamber puzzles, and lethal bio-organic abominations across four interconnected sectors.

## Core Pillars & Mechanics

- **Biohazard Vitals & Psychological Tension**:
  - `health`: Physical endurance (0-100%). Fine (>75%), Caution (25-74%), Danger (<25%). Sinks from monster claws; restored with green herbs.
  - `sanity`: Mental fortitude (0-100%). Low sanity induces terrifying hallucinations, elevated panic, and erratic aim. Restored in warm lit safe rooms.
  - `flashlightBattery`: (0-100%). Lighting corridors keeps stealth ambushes at bay; running dark accelerates sanity loss.
  - `ammo`:
    - `handgunRounds`: Precision standard caliber bullets.
    - `shotgunShells`: Devastating close-quarters buckshot.
  - `items`:
    - `greenHerbs`: Botanical healing compresses.
    - `batteries`: Lithium replacement cells.
    - `keycards`: Key items required to solve sector blast doors.
- **Facility Sectors & Encounters**:
  - `0: Emergency Ward`: Shambling infected, locked apothecary.
  - `1: Containment Labs`: Acid spitters, biometric fuse boxes.
  - `2: Deep Morgue & Catacombs`: Stalker lurkers in pitch black.
  - `3: Central Extraction Core`: The Nemesis Abomination Boss guarding the helipad elevator.
- **Tactical Survival Directives & Actions**:
  - `action:explore_chamber`: Searches dark rooms for scrap, ammo, and herbs (-6 flashlight, may trigger monster encounter).
  - `action:precision_handgun_shot`: Aimed shot targeting weak spot (-1 handgun ammo).
  - `action:shotgun_blast`: Point-blank high-damage buckshot (-1 shell).
  - `action:dodge_evasion`: Quick tactical sidestep away from monster attack (-15 sanity/energy).
  - `action:use_green_herb`: Consumes medicinal herb (+35 health).
  - `action:recharge_flashlight`: Inserts spare battery (+45 battery).
  - `action:rest_in_safe_room`: Enters classical safe room (+35 sanity, calms pulse).
  - `action:solve_sector_puzzle`: Fits key items / fuses into blast door mechanism.
  - `action:advance_to_sector:<sectorId>`: Traverses through unlocked blast door into next sector.
  - `action:trigger_extraction_flare`: Fires emergency distress flare on the helipad to achieve victory.
- **Victory & Defeat**:
  - Victory: Reach Sector 3, defeat or bypass the Core Abomination, unlock the blast doors, and trigger the extraction flare.
  - Defeat: Health drops to 0 (death) or sanity drops to 0 (fatal panic breakdown).
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `sector`: integer (0 to 3)
- `health`: integer (starts at 100)
- `sanity`: integer (starts at 90)
- `battery`: integer (starts at 80)
- `handgunRounds`: integer (starts at 10)
- `shotgunShells`: integer (starts at 4)
- `greenHerbs`: integer (starts at 1)
- `spareBatteries`: integer (starts at 1)
- `keyItems`: array of strings
- `sectorPuzzlesSolved`: array of boolean
- `currentMonster`: object or null
  - `name`: string
  - `hp`: integer
  - `maxHp`: integer
  - `damage`: integer
- `monstersSlain`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
