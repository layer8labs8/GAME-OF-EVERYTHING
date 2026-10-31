# 0054: Minigames Collection - Micro Blitz

A frantic, rapid-fire microgame gauntlet. The player faces a sequence of 5 distinct fast-action micro-challenges, each introduced with a bold imperative command ("DODGE!", "CATCH!", "PUMP!", "MATCH!", "DEFLECT!"). Players must execute precise actions under tight turn deadlines to survive the gauntlet with their lives intact.

## Core Rules

1. **Gauntlet Structure**:
   - 5 sequential microgame stages:
     1. **DODGE!**: Falling hazard in 1 of 3 lanes ($0, 1, 2$). Player must shift to an unthreatened lane.
     2. **CATCH!**: Falling golden gem in a designated lane. Player must move basket to match the falling lane.
     3. **PUMP!**: Balloon inflator. Player must execute the `pump` action 3 times before the deadline.
     4. **MATCH!**: Visual pattern match. Player must select the option ($0, 1, 2$) matching the target rune.
     5. **DEFLECT!**: Approaching projectile. Player must execute `deflect` when projectile enters intercept range.
   - Starting Lives: 4 hearts.
   - Failing any microgame deducts 1 life. Losing all lives triggers defeat.
   - Completing all 5 stages achieves victory.

2. **Actions by Microgame**:
   - Stage 1 (Dodge): `move_left`, `move_right`, `stay`
   - Stage 2 (Catch): `move_left`, `move_right`, `stay`
   - Stage 3 (Pump): `pump`, `wait`
   - Stage 4 (Match): `pick:0`, `pick:1`, `pick:2`
   - Stage 5 (Deflect): `deflect`, `wait`

3. **Scoring & End Conditions**:
   - `score = stagesWon * 200 + lives * 100 + (won ? 500 : 0)`.
   - Victory: successfully complete all 5 stages with at least 1 life remaining.
   - Defeat: lives reduced to 0 (`lives <= 0`).
