# 0025 - Top-down Shooter ("Shadow Breach")

## Concept & Theme
A gritty tactical top-down breach-and-clear shooter. Operating as an elite operative infiltrating a syndicate blacksite, players breach reinforced blast doors, deploy blinding flashbangs, neutralize hostile guards, eliminate shielded enforcers, and extract high-value intelligence from the central vault.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes operative with silenced carbine (12 rounds), 2 flashbangs, 2 breach charges, 100 HP, in Sector 1.
- `legalActions(state)`: Returns valid tactical infiltration actions.
- `step(state, action)`: Mutates state in place, resolves shots, explosions, flashbang stuns, enemy retaliations, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if player HP reaches 0, operative extracts with the payload, or max step limit reached.
- `score(state)`: Returns score based on hostiles neutralized, rooms breached, flashbang efficiency, and extraction bonus.

## Actions
- `move_n`, `move_s`, `move_e`, `move_w`: Move 24px in cardinal direction, align laser sight/facing vector.
- `fire`: Discharges silenced carbine round in facing direction (consumes 1 ammo, deals 25 damage).
- `flashbang`: Lobs tactical grenade 60px ahead, blinding and stunning all hostiles within 90px radius for 3 turns (requires flashbang inventory).
- `breach_charge`: Plants directional shaped explosive on adjacent reinforced blast door, breaching path to next sector and dealing 50 damage/stunning adjacent hostiles (requires breach charge inventory and adjacent door).
- `reload`: Reloads carbine magazine to full capacity (12 rounds).

## Hostiles & Obstacles
- **Syndicate Guards**: Patrolling combatants armed with submachine guns (20 HP, 8 damage).
- **Shielded Enforcers**: Armored bruisers with riot shields; immune to frontal fire unless stunned by breach or flashbang (60 HP, 16 damage).
- **Automated Sentry**: Ceiling-mounted laser turret locking onto operative line of sight (30 HP, 20 damage).
- **Blast Doors**: Heavy steel barriers blocking access between sectors, destructible only via `breach_charge`.

## Victory & Defeat
- **Victory**: Breach all 3 sectors, retrieve the vault core, and reach the extraction pad.
- **Defeat**: Operative HP drops to 0 or step limit (160 turns) expires.
