# 0036 - Metroidvania ("Chasm Crawler")

## Concept & Theme
A non-linear subterranean exploration platformer inspired by Metroid and Castlevania. Exploring the ancient alien citadel beneath Planet Phaeton, operative Varia discovers high-tech ability upgrades (Double Jump, Missile Launcher, Phase Dash) that unlock gated pathways, breach blast doors, neutralize hostile biomechanical crawlers, and defeat the Core Guardian.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes operative with standard blaster, 100 HP, in Sector 1 (Landing Bay).
- `legalActions(state)`: Returns valid platforming movements, jumps, blaster shots, phase dashes, and missile fires based on unlocked abilities and position.
- `step(state, action)`: Mutates state in place, executes player movement, updates projectiles, checks ability upgrade pickups, unlocks gated doors, advances enemies, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if player HP reaches 0, the Core Guardian in Sector 4 is destroyed and the reactor stabilized, or step limit (160 turns) reached.
- `score(state)`: Returns total score based on abilities acquired, sectors unlocked, hostiles slain, and reactor stabilization bonus.

## Actions
- `move_left`, `move_right`: Traverses platform terrain along horizontal axis.
- `jump`: Leaps upward onto higher platform tiers (single jump reaches +40px ledges; Double Jump reaches +80px high ledges).
- `fire`: Fires arm-cannon plasma bolt in facing direction (15 damage, activates blue energy switches).
- `missile`: Fires heavy concussive missile (40 damage, destroys red armored blast doors, requires missile ammo).
- `dash`: High-speed phase dash bypassing narrow laser forcefields (traverses 50px horizontally, invulnerable, requires Phase Dash upgrade).
- `rest`: Recharges energy cell and restores 15 HP up to 100 maximum.

## Ability Upgrades
- **Missile Expansion**: Found in Sector 1; unlocks `missile` action and grants 3 missiles to blow open red blast doors.
- **Double Jump Boots**: Found in Sector 2; allows scaling high ledges to reach Sector 3.
- **Phase Dash Thruster**: Found in Sector 3; allows phasing through laser security gates to access Sector 4.

## Victory & Defeat
- **Victory**: Infiltrate Sector 4 and defeat the Core Guardian boss (120 HP).
- **Defeat**: Operative HP drops to 0 or step limit expires.
