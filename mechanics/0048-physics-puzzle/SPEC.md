# 0048: Physics Puzzle - Gravity Sling

A deterministic orbital physics puzzle where the player navigates a deep-space probe through gravitational anomalies, asteroid belts, and energy beacon waypoints to reach the warp gate.

## Core Rules

1. **Spacecraft Mechanics**:
   - The probe exists on a discrete grid `(width, height)`.
   - The probe maintains an integer velocity vector `(vx, vy)` clamped to `[-2, 2]`.
   - The craft has a limited fuel supply `maxFuel`.

2. **Actions**:
   - `thrust_up` (`U`): adds `(0, -1)` to velocity, consumes 1 fuel unit.
   - `thrust_down` (`D`): adds `(0, 1)` to velocity, consumes 1 fuel unit.
   - `thrust_left` (`L`): adds `(-1, 0)` to velocity, consumes 1 fuel unit.
   - `thrust_right` (`R`): adds `(1, 0)` to velocity, consumes 1 fuel unit.
   - `coast` (`C`): applies no thrust, consumes 0 fuel, coasting on existing momentum.

3. **Physics Integration Step**:
   - Velocity is updated by player thrust (if fuel remains).
   - Gravity wells within their influence radius apply gravitational acceleration towards their centers:
     - For each well at `(wx, wy)` with range $R$:
       - If $\max(|wx - x|, |wy - y|) \le R$:
         - $\Delta vx = \text{sign}(wx - x)$
         - $\Delta vy = \text{sign}(wy - y)$
   - Velocity is clamped to `[-2, 2]`.
   - Trajectory is sub-stepped along `\max(|vx|, |vy|)` discrete points:
     - If any sub-step exits boundaries or impacts an asteroid or singularity center, the craft crashes (defeat).
     - Any beacon encountered along the path is collected.
     - If all beacons are collected and the warp gate (goal) is reached, the probe warps out (victory).

4. **Victory & Defeat**:
   - **Victory**: Collect all required beacons and reach the warp gate (`goal`).
   - **Defeat**: Probe collides with boundary or asteroid or singularity center, or runs out of fuel while stationary, or exceeds `maxSteps`.

5. **Levels & Solver**:
   - 10 verified levels loaded from `levels.json`.
   - Shortest-path BFS solver in `solver.js` computes optimal moves and par.
