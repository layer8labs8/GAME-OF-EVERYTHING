# 0037: Collectathon - Relic Rush

A 3D-inspired open-exploration platformer collectathon. The explorer traverses a multi-tiered floating sky citadel to gather 5 ancient Celestial Relics, dozens of glowing Sky Gems, and movement-enhancing abilities.

## Core Rules

1. **Player & Movement**:
   - The explorer traverses platform elevations across horizontal coordinates ($x \in [0, 40]$) and vertical elevations ($y \in [0, 15]$).
   - Solid platforms, floating ledges, stone chests, and hazard pits.
   - Stats:
     - `stamina`: 100 max stamina (consumed by special jumps and gliding; recovers while standing on solid platforms).
     - `hp`: 3 hearts / 100 HP.
     - `relicsCollected`: count of major Celestial Relics (5 total).
     - `gemsCollected`: count of Sky Gems (40 total).
   - Abilities:
     - `canDoubleJump`: unlocked by default or discovered in Meadow.
     - `canGlide`: unlocked by finding the Wing Feather relic.
     - `canGroundPound`: unlocked by finding the Heavy Boots amulet.

2. **Actions**:
   - `move_left`: steps left along current platform or airborne trajectory.
   - `move_right`: steps right along current platform or airborne trajectory.
   - `jump`: vaults upward from ground onto higher ledges.
   - `double_jump`: secondary aerial flutter jump, reaching elevated perches. Legal when airborne and `stamina >= 15`.
   - `glide`: deploys glider wings to drift horizontally across wide gaps without falling rapidly. Legal when airborne and `canGlide` unlocked.
   - `ground_pound`: slams straight downward from the air, breaking cracked stone chests below. Legal when airborne and `canGroundPound` unlocked.
   - `interact`: activates nearby ancient shrines, opens unlocked chests, and pays gem tributes to open sealed gates.
   - `rest`: catches breath on ground, recovering +35 stamina.

3. **Collectibles & Gating**:
   - **5 Celestial Relics**:
     - *Relic 1 (High Meadow)*: atop an elevated stone pillar.
     - *Relic 2 (Sunken Crypt)*: inside a reinforced stone chest (requires `ground_pound`).
     - *Relic 3 (Cloud Chasm)*: on an isolated floating sky islet (requires `glide`).
     - *Relic 4 (Tribute Sanctum)*: behind a sealed gate requiring 25 Sky Gems.
     - *Relic 5 (Celestial Spire)*: at the highest pinnacle of the citadel ($x=36, y=14$).
   - **Sky Gems**: 40 gems scattered throughout the ruins.

4. **Victory & Defeat**:
   - **Victory**: Collect all 5 Celestial Relics and activate the Celestial Beacon at the Spire pinnacle.
   - **Defeat**: Fall into deep-sky void without stamina/gliding or run out of turns (`MAX_STEPS = 120`).
