# 0032 — Tank Battle ("Iron Tracks")

## Concept
Tactical top-down armor combat simulator. Command an armored tank to defend your forward headquarters (HQ Eagle) from incoming waves of hostile mechanized tanks while navigating a destructible maze of brick barricades and indestructible steel barriers.

## Arena & Coordinates
- Discrete 10x10 battle arena.
- `(0, 0)` is top-left, `(9, 9)` is bottom-right.
- Cell types:
  - `.` Open terrain
  - `B` Destructible Brick barricade (demolished by explosive shells)
  - `S` Reinforced Steel bunker (impervious to ballistic shells)
  - `H` Forward Command HQ (vulnerable to enemy fire; loss condition if destroyed)
- Spawn points:
  - Player spawns at bottom center `(4, 8)`.
  - HQ stands fortified at `(4, 9)` surrounded by protective brick walls.
  - Enemy armor columns spawn from the northern sector `(0, 0)`, `(4, 0)`, `(9, 0)`.

## Combat Dynamics
- **Ballistics**:
  - High-velocity ballistic shells travel in straight cardinal trajectories.
  - Shell collisions destroy brick walls and eliminate hostile armor units.
  - Mid-air collision between player and enemy shells detonates both projectiles harmlessly.
- **Hostile AI**:
  - Enemy tanks employ line-of-sight targeting against the player and the vulnerable HQ base.
  - If unobstructed line of sight is acquired, enemy tanks open fire.
  - Hostile units navigate around barricades and advance southward.
- **Armor & Lives**:
  - Player starts with 3 hull plates (lives).
  - Eliminating a hostile tank awards +50 points.
  - Demolishing brick barricades awards +5 points.

## Action Space
- `'move_n'`, `'move_s'`, `'move_e'`, `'move_w'`: Advance 1 tile in cardinal direction (if destination tile is clear).
- `'turn_n'`, `'turn_s'`, `'turn_e'`, `'turn_w'`: Rotate turret/hull in place.
- `'fire'`: Launch a ballistic shell in current facing direction (available when reload timer is 0).
- `'wait'`: Hold position.

## Victory & Termination
- **Victory**: Eliminate all 6 hostile tanks across the sortie while protecting the HQ.
- **Defeat**: Headquarters base destroyed, player loses all 3 hull lives, or step count exceeds `MAX_STEPS = 200`.
