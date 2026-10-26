# 0034 — Precision Platformer ("Chrono Leap")

## Concept
A responsive, high-precision single-screen platformer inspired by classic momentum runners (*Celeste*, *Super Meat Boy*). Master tight aerial physics, wall rebounds, and 8-way directional dashes to overcome treacherous spike chasms, retrieve celestial crystals, and reach the exit portal.

## Arena & Coordinates
- 16x12 tile chamber (320x240 logical canvas coordinate system).
- Tile types:
  - `.` Empty air
  - `#` Solid bedrock platform / wall
  - `^` Razor spikes (lethal hazard: triggers respawn and life loss)
  - `C` Floating celestial crystal (required collectible)
  - `P` Quantum rift portal (exit conduit activated once all crystals are gathered)
  - `S` Chamber spawn anchor

## Kinematics & Mechanics
- **Horizontal Movement**: Left and right acceleration with immediate momentum damping.
- **Gravity & Jump**: Gravity acceleration pulls the runner downward toward a clamped terminal velocity. Jumping from solid ground imparts an upward impulse.
- **Air Dash**:
  - The runner possesses an omnidirectional kinetic dash (`dash_up`, `dash_right`, `dash_left`, `dash_up_right`).
  - Dashing propels the runner instantly across hazardous chasms.
  - Dash charges (1 maximum) regenerate immediately upon touching solid bedrock.

## Action Space
- `'left'`, `'right'`: Accelerate horizontally.
- `'jump'`: Leap from solid ground.
- `'dash_right'`, `'dash_left'`, `'dash_up'`, `'dash_up_right'`: Expend air dash.
- `'wait'`: Coast with current momentum and gravity.

## Victory & Termination
- Collect all crystals (`C`) and enter the active portal (`P`) to win.
- Exhausting all 3 lives or exceeding `MAX_STEPS = 180` results in defeat.
