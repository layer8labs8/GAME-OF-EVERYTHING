# 0040: Auto-Scrolling Platformer - Magma Surge

A vertical auto-scrolling platformer where the player ascends an active volcanic shaft while molten lava continuously rises from beneath. Inspired by vertical escape stages in classic platformers like *Super Mario Bros 3*, *Sonic the Hedgehog*, and *Spelunky*.

## Core Rules

1. **Auto-Scrolling Lava Dynamics**:
   - The volcanic shaft spans horizontal bounds $x \in [0, 120]$ and vertical height up to 500m.
   - The viewport and magma line automatically advance upward by $+2$ elevation units each standard turn.
   - Any player whose elevation falls below the rising magma line ($y < \text{scrollY}$) is instantly consumed by molten lava (defeat).

2. **Player Movement & Actions**:
   - `move_left`: steps left along the shaft ($x \gets \max(2, x - 3)$).
   - `move_right`: steps right along the shaft ($x \gets \min(118, x + 3)$).
   - `jump`: vaults upward ($vy = 4, y \gets y + 4$). Consumes 10 stamina. Legal if on ground and `stamina >= 10`.
   - `wall_slide`: clings to the left or right shaft wall to arrest downward fall speed. Legal if against wall and airborne.
   - `wall_kick`: springs diagonally upward away from shaft wall ($vy = 4, y \gets y + 4$). Consumes 10 stamina. Legal if wall-sliding or against wall and airborne.
   - `dash_left`: horizontal mid-air dash ($x \gets \max(2, x - 8)$). Consumes 20 stamina. Legal if airborne and `stamina >= 20`.
   - `dash_right`: horizontal mid-air dash ($x \gets \min(118, x + 8)$). Consumes 20 stamina. Legal if airborne and `stamina >= 20`.
   - `grapple_up`: fires magnetic grapple cable directly overhead, hoisting player onto the nearest ledge above. Consumes 1 grapple charge. Legal if `grapples > 0`.
   - `rest`: catches breath on a solid stone platform (+35 stamina).

3. **Platforms & Hazards**:
   - **Solid Basalt Ledges**: durable resting surfaces.
   - **Crumbling Pumice**: fragile platforms that shatter upon departure.
   - **Steam Vents**: geological vents that blast the player vertically upward by $+6$ units.
   - **Obsidian Crystals**: high-value collectible crystals (+25 score each).

4. **Victory & Defeat**:
   - **Victory**: Reach the caldera extraction rim ($y \ge 500$) before the volcanic eruption engulfs the shaft.
   - **Defeat**: Submerged in rising magma ($y < \text{scrollY}$), or step limit exceeded (`MAX_STEPS = 120`).
