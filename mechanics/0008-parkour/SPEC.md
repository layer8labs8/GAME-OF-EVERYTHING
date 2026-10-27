# 0008 - Parkour ("Rooftop Velocity")

## Concept & Theme
A high-velocity urban freerunning and parkour game set across skyscraper rooftops. The runner chains wall climbs, hurdle vaults, low duct slides, and momentum speed boosts to traverse a hazardous urban skyline without losing velocity.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes runner at start of rooftop course with 3 kinetic shields, 50 momentum, and procedural obstacle generation.
- `legalActions(state)`: Returns valid parkour techniques (`run`, `jump`, `slide`, `wall_run`, `boost`).
- `step(state, action)`: Mutates state in place, advances runner along rooftop, checks obstacle clearance, updates momentum meter, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if kinetic shields deplete or target distance (1000m) is reached.
- `score(state)`: Returns score calculated from distance, momentum maintenance, and streak multipliers.

## Actions
- `run`: Standard forward sprint across rooftop floor.
- `jump`: Airborne leap clearing rooftop gaps and floor hurdles.
- `slide`: Low friction slide slipping under hanging ventilation ducts and neon signs.
- `wall_run`: Vertical wall scramble climbing over sheer brick walls and chimneys.
- `boost`: High-speed kinetic surge (costs 25 momentum, surges 2x distance).

## Obstacles
- **Chasm Gap**: Sheer drop between skyscrapers (cleared by `jump`).
- **Vent Duct**: Overhead low-clearance metallic pipe (cleared by `slide`).
- **Concrete Barrier**: High sheer obstacle (cleared by `wall_run`).
- **Kinetic Ring**: Floating bonus token restoring 20 momentum and awarding points.

## Victory & Defeat
- **Victory**: Reach 1000 meters across the skyline.
- **Defeat**: Deplete all 3 kinetic shields from collisions.
- **Termination**: `isOver(state) === true`.
