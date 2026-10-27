# 0062: Pinball - Neon Pinball

A high-octane synthwave arcade pinball simulator with deterministic 2D physics. Players launch balls into an electric neon playfield featuring reactive round bumpers, angled slingshots, top rollover lanes, and responsive dual flippers.

## Core Rules

1. **Table Geometry & Physics**:
   - Table dimensions: $300 \times 500$ px.
   - Ball radius: 7 px with deterministic Newtonian gravity, velocity reflection, and restitution.
   - Three high-voltage bumpers ($B_1, B_2, B_3$) at the upper table that kick the ball radially and award 100 points each.
   - Dual slingshots above the flippers that repel incoming balls inward.
   - Three rollover gates ($L_1, L_2, L_3$) that activate a score multiplier ($2\times, 3\times, 5\times$) when all three are illuminated.

2. **Flippers & Plunger**:
   - Left Flipper: Pivoting at $(90, 440)$.
   - Right Flipper: Pivoting at $(210, 440)$.
   - Bottom Drain: Center gap at $y \ge 470$.
   - Plunger Lane: Right channel ($x \ge 270$) where the ball starts each turn.

3. **Actions**:
   - `launch`: Releases spring plunger to propel ball into upper table (legal when ball is at launch lane).
   - `flip_left`: Energizes left flipper upward for 4 physics ticks.
   - `flip_right`: Energizes right flipper upward for 4 physics ticks.
   - `flip_both`: Energizes both left and right flippers upward.
   - `nudge`: Imparts slight lateral kinetic pulse to alter ball trajectory.
   - `wait`: Simulates 1 physics tick with flippers in resting position.

4. **Game End & Scoring**:
   - 3 Balls per game (`ballsLeft: 3`).
   - Draining a ball resets ball to plunger lane. Losing all 3 balls terminates the game.
   - Max game step budget: 600 steps.
   - `score = bumperPoints + rolloverPoints + slingshotPoints + (targetScoreBonus)`.
