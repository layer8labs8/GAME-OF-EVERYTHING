# Citadel Guard (0101 — Tower Defense)

## Rules
Defend the kingdom's citadel from 5 waves of invading monster hordes marching along a winding cobblestone path.
- **6 Defense Platforms**: Platforms `0..5` situated alongside the path can house defensive towers.
- **Towers**:
  - **Ballista** (Cost: `25g`): Fast physical piercing bolts (Damage: `3`, Range: `110px`).
  - **Cannon** (Cost: `40g`): High-damage explosive artillery (Damage: `7`, Range: `100px`).
  - **Frost** (Cost: `35g`): Ice beam that chills and slows enemy march speed by 50% (Damage: `2`, Range: `90px`).
  - **Upgrade** (Cost: `30g`): Doubles damage and increases range by `+15px`.
- **Actions**:
  - `'wait'`: advances battle simulation by one tick.
  - `'build_ballista_<slot>'`: constructs a Ballista tower on empty slot `0..5`.
  - `'build_cannon_<slot>'`: constructs a Cannon tower on empty slot `0..5`.
  - `'build_frost_<slot>'`: constructs a Frost tower on empty slot `0..5`.
  - `'upgrade_<slot>'`: upgrades the existing tower on slot `0..5`.
- **Gold & Citadel**:
  - Defeating a creep yields `+10g` and `+50` points.
  - A creep reaching the citadel base damages the citadel (`1` HP, starts with `10` HP).
  - Successfully surviving all `5` waves awards a `+500` victory bonus.
  - Concludes when citadel HP reaches `0`, all waves are cleared, or at `MAX_STEPS = 500`.

## State
- `slots`: array of 6 objects `{ type, level, cooldown }` (`type === 'empty'` when vacant)
- `creeps`: array of `{ id, x, y, pathIdx, hp, maxHp, speed, slowed }`
- `gold`: integer `>= 0` (starts with `60g`)
- `citadelHp`: integer `0..10`
- `wave`: integer `1..5`
- `waveCreepsLeft`: integer
- `spawnTimer`: integer
- `points`: integer `>= 0`
- `won`: boolean
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
Subset of affordable build/upgrade commands plus `'wait'` (`[]` when game is over).

## Score
`state.points`
