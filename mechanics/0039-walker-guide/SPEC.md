# 0039: Walker Guide

A discrete, turn-based puzzle strategy platformer. The player commands an autonomous brigade of marching minions navigating treacherous caverns filled with sheer drops, lethal hazard pits, and obstacle barriers. By assigning specialized tools—floaters, blockers, builders, diggers, miners, and bombers—the player alters terrain and pathing to rescue the required quota of minions into the exit vortex.

## Core Rules

1. **Cavern Map & Grid**:
   - $W \times H = 20 \times 12$ tile grid.
   - Tile types:
     - `.` (Air): walkable/fall-through empty space.
     - `#` (Earth): destructible rock that can be dug, mined, or bombed.
     - `B` (Steel): indestructible steel wall or bedrock.
     - `S` (Spawn Portal): entrance hatch where minions drop into the cavern.
     - `E` (Exit Vortex): rescue goal where minions escape.
     - `X` (Hazard Spikes / Lava): instant death upon contact.
     - `_` (Bridge Step): player-constructed ramp/platform.

2. **Minion Dynamics & Physics**:
   - Total minions to spawn: 6.
   - Rescue quota: at least 4 minions must reach the exit vortex to win.
   - Max turns: 100 turns limit.
   - Minions spawn from the portal one by one (1 minion every 3 turns until all 6 have spawned).
   - Each minion possesses:
     - `id`: unique integer ($0..5$).
     - `x`, `y`: grid coordinates.
     - `vx`: horizontal facing direction ($+1$ for right, $-1$ for left).
     - `role`: `"walker"`, `"blocker"`, `"builder"`, `"digger"`, `"miner"`, or `"floater"`.
     - `isFloater`: boolean flag indicating deployment of parachute/umbrella.
     - `fallDistance`: count of consecutive air tiles dropped.
     - `buildStepsLeft`: remaining stair steps to build (for builders).
     - `bombCountdown`: turns until self-destruct (for bombers).
     - `status`: `"spawning"`, `"active"`, `"saved"`, `"dead"`.
   - **Gravity & Falling**:
     - If the tile directly beneath the minion is air `.` or hazard `X`, the minion drops downward ($y \gets y + 1$).
     - Each step dropped increments `fallDistance`.
     - If landing on a solid surface:
       - If `fallDistance > 3` and `!isFloater`, the minion splats upon impact (`dead`).
       - If `isFloater` or `fallDistance <= 3`, the minion lands safely (`fallDistance = 0`).
     - If entering a hazard tile `X`, the minion perishes immediately.
   - **Horizontal Movement**:
     - Walkers advance forward ($x \gets x + vx$).
     - If the destination tile $(x + vx, y)$ is blocked by solid earth `#`, steel `B`, or a `"blocker"` minion:
       - If the tile above $(x + vx, y - 1)$ is open air, the minion steps up the 1-tile ledge ($x \gets x + vx, y \gets y - 1$).
       - Otherwise, the minion bumps into the obstruction and reverses direction ($vx \gets -vx$).

3. **Specialized Roles & Abilities**:
   - `state.inventory`:
     - `floater`: 2 uses. Grants permanent umbrella; minion floats safely from any altitude.
     - `blocker`: 2 uses. Stops in place, turning into an impenetrable barrier that forces other minions to turn around.
     - `builder`: 4 uses. Constructs up to 3 diagonal bridge steps `_` across chasms.
     - `digger`: 2 uses. Digs vertically downward through destructible earth `#`.
     - `miner`: 2 uses. Excavates diagonally downward-forward through destructible earth `#`.
     - `bomber`: 2 uses. Triggers a 3-turn fuse, detonating all destructible `#` tiles in a 1-tile radius.

4. **Actions**:
   - `"wait"`: advances simulation by 1 turn without assigning new roles.
   - `"floater:<id>"`: equips minion `<id>` with floater role. Legal if `inventory.floater > 0` and minion is active and not already a floater.
   - `"blocker:<id>"`: assigns minion `<id>` as stationary blocker. Legal if `inventory.blocker > 0` and minion is active.
   - `"builder:<id>"`: assigns minion `<id>` as builder. Legal if `inventory.builder > 0` and minion is active.
   - `"digger:<id>"`: assigns minion `<id>` as vertical digger. Legal if `inventory.digger > 0` and minion is active on destructible earth.
   - `"miner:<id>"`: assigns minion `<id>` as diagonal miner. Legal if `inventory.miner > 0` and minion is active.
   - `"bomber:<id>"`: arms minion `<id>` with self-destruct fuse. Legal if `inventory.bomber > 0` and minion is active.

5. **Scoring & End Conditions**:
   - `score = savedCount * 150 - deadCount * 30 + Math.max(0, MAX_TURNS - turn) * 2`.
   - Victory: `savedCount >= quota`.
   - Defeat: remaining living minions cannot reach quota (`(totalMinions - deadCount) < quota`), or turn limit reached with `savedCount < quota`.
