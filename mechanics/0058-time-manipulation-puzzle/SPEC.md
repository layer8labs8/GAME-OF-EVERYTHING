# 0058: Time Manipulation Puzzle - Chronos Paradox

A mind-bending cooperative chrono-puzzle. The player records timeline paths in a quantum facility, rewinds time to spawn past temporal echoes (Echo Clones), and synchronizes with past selves to hold pressure plates and bypass security gates to reach the exit portal.

## Core Rules

1. **Chamber Grid**:
   - 8x8 discrete grid of Walls (`#`), Open Floor (`.`), Pressure Plates (`P1`, `P2`), Security Gates (`G1`, `G2`), Chrono Orbs (`O`), and Exit Portal (`X`).
   - Security Gate `G1` remains closed unless a Player or an Echo Clone is actively standing on Pressure Plate `P1` during the current tick.
   - Security Gate `G2` remains closed unless a Player or an Echo Clone is actively standing on Pressure Plate `P2` during the current tick.

2. **Chrono Loop & Echo Clones**:
   - Each loop consists of up to 24 timeline ticks (`tick: 0..24`).
   - Player records movement actions on each tick (`up`, `down`, `left`, `right`, `wait`).
   - Triggering `rewind` resets time to `tick: 0`, repositions the player at the entrance, and stores the completed timeline as an active **Echo Clone**.
   - Up to 2 Echo Clones can exist simultaneously, replaying their past movements tick-by-tick in lockstep with the player.
   - Total rewinds per run: 12 rewinds max.

3. **Actions**:
   - `up`, `down`, `left`, `right`: Movement in cardinal directions (blocked by walls and closed gates).
   - `wait`: Remain stationary on current tile for 1 tick.
   - `rewind`: Collapse timeline, spawn Echo Clone of current recording, and reset to tick 0.

4. **Progression & Scoring**:
   - Reaching the Exit Portal (`X`) clears the current chamber and advances to the next stage.
   - 3 sequential chambers of escalating complexity.
   - Victory: Successfully clear all 3 chambers.
   - Defeat: Exceeding rewind allowance (`rewindsUsed >= maxRewinds`).
   - `score = chambersCleared * 400 + orbsCollected * 50 + (won ? 500 : 0) - totalTicks`.
