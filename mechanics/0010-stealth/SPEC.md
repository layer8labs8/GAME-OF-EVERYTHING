# 0010 — Stealth ("Shadow Infiltrator")

## Concept
Top-down tactical infiltration game. Sneak past patrolling security guards, avoid their illuminated vision cones, use acoustic pebble distractions to manipulate patrol routes, retrieve the encrypted data core, and escape via the extraction vent undetected.

## Arena & Coordinates
- Discrete 10x8 grid.
- `(0, 0)` is top-left, `(9, 7)` is bottom-right.
- Cell types:
  - `.` Walkable floor
  - `#` Concrete pillar / wall (blocks both movement and guard vision)
  - `D` Encrypted data core
  - `E` Extraction ventilation grate (active once data core is collected)

## Guards & Vision Cones
- Two autonomous guards with predefined 4-waypoint patrol loops.
- Direction facing: `'N'` (up), `'S'` (down), `'E'` (right), `'W'` (left).
- Vision cone:
  - Forward line of sight up to 3 tiles directly ahead.
  - Flanking vision 1 tile forward-left and forward-right.
  - Pillars (`#`) obstruct vision rays (guards cannot see through walls).
- Detection:
  - If the infiltrator enters an unblocked vision tile, the guard raises alarm and captures the player.

## Distractions
- The player carries 2 noise pebbles.
- Throwing a pebble generates an acoustic ping at the landing tile (up to 3 tiles away in any cardinal direction).
- Guards within earshot (Manhattan distance <= 3) turn toward the disturbance and investigate the sound location for their next step.

## Action Space
- `'up'`, `'down'`, `'left'`, `'right'`: Move sneakily 1 tile.
- `'wait'`: Hold position and track guard patrol patterns.
- `'pebble_up'`, `'pebble_down'`, `'pebble_left'`, `'pebble_right'`: Launch distraction pebble (consumes 1 pebble).

## Victory & Termination
- Collect the data core (`D`) and reach extraction (`E`) to win.
- Getting spotted by any guard triggers instant capture and loss.
- Exceeding `MAX_STEPS = 120` triggers lock-down failure.
