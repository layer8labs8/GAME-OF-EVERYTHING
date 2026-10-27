# 0038: Side Scroller - Cyber Ronin

A fast-paced 16-bit action side-scrolling platformer inspired by classics like *Shinobi*, *Strider*, and *Mega Man X*. The player controls an agile cyber-ninja traversing a multi-tiered neo-tokyo factory sector with katana slashes, ranged shurikens, wall kicks, phase dashes, and a climactic confrontation against the Goliath Forge Mech boss.

## Core Rules

1. **Movement & Combat**:
   - Continuous horizontal side-scrolling corridor spanning $x \in [0, 200]$ with platform ledges, hazard spikes, and laser fences.
   - Stats:
     - `hp`: 100 max health.
     - `stamina`: 100 max stamina (used for dashes, special slashes, and deflections; recovers +10 passively per turn).
     - `shurikens`: 5 ranged throwing stars (can restock from supply caches).
     - `combo`: consecutive hit multiplier ($1\times \to 3\times$).
     - `facing`: 1 (right) or -1 (left).

2. **Actions**:
   - `move_left`: steps left and sets facing direction ($x \gets \max(0, x - 2)$).
   - `move_right`: steps right and sets facing direction ($x \gets \min(200, x + 2)$).
   - `jump`: vaults upward onto higher platforms ($y \gets y + 3$). Consumes 10 stamina. Legal if on ground and `stamina >= 10`.
   - `wall_kick`: springs off an adjacent wall for extra height and distance. Legal if near wall and airborne.
   - `slash`: executes high-frequency katana strike in facing direction (35 damage, builds combo). Always legal.
   - `throw_shuriken`: flings throwing star along horizontal line (deals 25 damage from distance). Consumes 1 shuriken. Legal if `shurikens > 0`.
   - `phase_dash`: quick invulnerable horizontal surge ($+6$ units forward), bypassing hazard spikes and enemy projectiles. Consumes 25 stamina. Legal if `stamina >= 25`.
   - `deflect`: raises plasma guard, deflecting incoming enemy projectiles back at hostiles. Consumes 15 stamina. Legal if `stamina >= 15`.
   - `rest`: takes defensive stance on solid platform, recovering +35 stamina.

3. **Stage Obstacles & Boss**:
   - **Drone Sentries**: flying patrol bots (25 HP).
   - **Cyber Enforcers**: melee brawlers with shock batons (50 HP).
   - **Hazard Spikes**: lethal floor pits that inflict 30 damage if stepped on without dashing.
   - **Goliath Forge Mech (Boss)**:
     - Stationed at $x = 175..195$ with 150 HP.
     - Emits telegraphed hammer slams and missile volleys.

4. **Victory & Defeat**:
   - **Victory**: Defeat the Goliath Forge Mech and cross the extraction gate ($x \ge 195$).
   - **Defeat**: Player HP reduced to 0, or turn limit reached (`MAX_STEPS = 120`).
