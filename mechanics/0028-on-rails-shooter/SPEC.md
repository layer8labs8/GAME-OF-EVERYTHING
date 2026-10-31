# 0028: On-Rails Shooter - Rail Phantom

A fast-paced on-rails space shooter. The player's starfighter hurtles forward through a 3D neon hyper-conduit while the player aims, fires blasters, locks on with homing missiles, executes defensive barrel rolls, and manages heat and energy reserves.

## Core Rules

1. **Spacecraft & Corridor Mechanics**:
   - The player's ship is positioned on a 2D cross-section plane within grid boundaries:
     - $x \in [-2, 2]$ (horizontal lanes)
     - $y \in [-1, 1]$ (vertical lanes: upper, center, lower)
   - Ship stats:
     - `hp`: 100 max health.
     - `energy`: 100 max energy, used for barrel rolls and boosts (+10 passive recovery per turn).
     - `heat`: 0 to 100 blaster heat. Blasters cannot fire when overheated (`heat >= 80`).
     - `missiles`: ordnance count for multi-target lock-on salvo.
   - Rail distance: progress from 0m to 1,000m. Rail advances by +15m each standard step (+35m during `boost`).

2. **Actions**:
   - `move_up`: shifts player ship up ($y \gets \max(-1, y - 1)$).
   - `move_down`: shifts player ship down ($y \gets \min(1, y + 1)$).
   - `move_left`: shifts player ship left ($x \gets \max(-2, x - 1)$).
   - `move_right`: shifts player ship right ($x \gets \min(2, x + 1)$).
   - `fire_blaster`: fires forward twin plasma cannons. Damages closest enemy in the player's current lane. Heat +20. Legal if `heat < 80`.
   - `lock_missile`: launches target-seeking micro-missiles hitting all visible enemies or boss modules. Consumes 1 missile. Legal if `missiles > 0`.
   - `barrel_roll`: rapid evasive spin, deflecting enemy fire and granting invulnerability for the turn. Consumes 25 energy. Legal if `energy >= 25`.
   - `boost`: accelerates ship (+35m rail progress), evading enemy fire. Consumes 20 energy. Legal if `energy >= 20`.
   - `vent_heat`: activates thermal vents (-40 heat, +25 energy). Always legal.

3. **Enemies & Hazards**:
   - Enemy units spawn at depth $z \in [3, 8]$:
     - **Scout Drones**: fast, low HP (25 HP).
     - **Interceptors**: evasive, fire dual lasers (50 HP).
     - **Barrier Rings**: physical hazard rings that must be aligned with the open conduit sector.
   - **Giga Dreadnought Boss**:
     - Arrives at 800m.
     - Has 3 target modules:
       - Left Shield Generator (60 HP)
       - Right Shield Generator (60 HP)
       - Reactor Core (120 HP, invulnerable until both shield generators are destroyed).

4. **Victory & Defeat**:
   - **Victory**: Destroy the Giga Dreadnought reactor core and clear the sector (distance $\ge$ 1,000m).
   - **Defeat**: Ship HP reaches 0, or turn limit is exceeded (`MAX_STEPS = 100`).
