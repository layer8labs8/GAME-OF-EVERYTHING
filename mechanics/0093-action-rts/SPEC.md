# 0093-action-rts: Battle Commander (Action RTS)

An action-oriented real-time strategy (Action RTS / MOBA lane pusher) game where the player commands a powerful frontline Champion hero coordinating with marching automated minion waves to topple defensive towers and demolish the enemy ancient core.

## Core Rules & Features
- **Lane Highway (Positions 0 to 6)**:
  - Pos 0: Player Ancient Base Core (400 HP).
  - Pos 1: Player Defensive Citadel Tower (250 HP).
  - Pos 2: Allied Outpost Ridge.
  - Pos 3: River Choke Point (Neutral battlefield center).
  - Pos 4: Enemy Incursion Ridge.
  - Pos 5: Enemy Defensive Citadel Tower (250 HP).
  - Pos 6: Enemy Ancient Base Core (400 HP).
- **Hero Champions**:
  - **Player Commander ("Aegis Knight")**:
    - 200 HP, 100 Mana.
    - Basic melee/ranged strike (25 damage).
    - `ability_shockwave` (Costs 30 Mana): Unleashes an arcane blast inflicting 45 AOE damage to all opposing forces in the sector.
    - `ability_rally` (Costs 25 Mana): Empowers allied minions in the sector, granting +20 HP and +10 bonus damage.
    - `rest_mana`: Regenerates +30 Mana and +15 HP when pulling back from the front.
  - **Enemy Commander ("Shadow Warlock")**:
    - Automated AI hero that casts dark bolts, harasses allied minions, and defends towers.
- **Automated Creep Waves**:
  - Every 4 ticks, both Ancient Bases spawn a wave of 3 Vanguard Minions (40 HP, 10 damage).
  - Minions march down the lane, clashing with enemy waves, engaging opposing heroes, and besieging defensive towers.
- **Tower Defenses**:
  - Citadel towers automatically unleash 20 damage shells per tick against opposing enemy minions and heroes within their sector.
- **Victory & Defeat**:
  - **Total Victory**: Demolishing the Enemy Ancient Base Core (Pos 6).
  - **Defeat**: Loss of the Player Ancient Base Core (Pos 0).
  - **Timeout (150 Ticks)**: Concludes based on remaining Core/Tower integrity and lane pushing progress.
- **Bot Contract**:
  - `createState(seed)`: Initializes hero stats, towers, lane positions, and minion waves.
  - `legalActions(state)`: Produces valid tactical maneuvers (`move_left`, `move_right`, `hero_attack`, `ability_shockwave`, `ability_rally`, `rest_mana`, `tick`).
  - `step(state, action)`: Applies hero commands, computes tower crossfires, advances minion combat, and steps simulation. Returns `{ reward, done }`.
  - `isOver(state)`: Checks base destruction or step threshold.
  - `score(state)`: Evaluates lane progress, towers destroyed, hero survival, and victory bonus.
