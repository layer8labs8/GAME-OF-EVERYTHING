# 0012 - Musou ("Dynasty Cleave")

## Concept & Theme
An expansive one-versus-many crowd combat arena. A legendary frontline general armed with a heavy crescent halberd cleaves through marching battalions of enemy conscripts, archers, and vanguard officers across battle zones.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes general at center, 100 HP, 100 stamina, zero musou gauge, and wave 1 battalion (grunts, archers, vanguard captain).
- `legalActions(state)`: Returns valid tactical battlefield actions (directional maneuvers, wide cleaves, ground smashes, and Musou ultimate).
- `step(state, action)`: Mutates state in place, executes halberd sweep, resolves horde casualties, advances enemy formations, charges musou gauge, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if player HP reaches 0, all 3 battalion commanders are defeated, or max step limit reached.
- `score(state)`: Returns score based on total K.O. count, combo streak, and commander slay bonuses.

## Actions
- `move_n`, `move_s`, `move_e`, `move_w`: Traverse battlefield lines.
- `wide_cleave`: Sweeping 180-degree blade arc dealing 18 damage to all hostiles in forward arc (costs 12 stamina, builds 6 Musou per hit).
- `heavy_smash`: Ground-splitting impact dealing 35 damage and knocking back front ranks (costs 25 stamina, builds 15 Musou).
- `musou_rampage`: Whirling invincible tempest dealing 60 damage to all surrounding enemies within 90px (requires 100 Musou gauge).
- `dash`: Swift tactical dash evading surrounding soldier clusters (costs 20 stamina).
- `rest`: Recovers 40 stamina up to 100 max.

## Hostiles
- **Footsoldier Grunts**: Marching infantry advancing in clusters (15 HP, 4 damage).
- **Archers**: Ranged skirmishers firing volley arrows from backlines (12 HP, 8 damage).
- **Vanguard Captain**: Heavily armored officer wielding a battleaxe (80 HP, 18 damage).

## Victory & Defeat
- **Victory**: Slay the vanguard officers across all 3 battle zones.
- **Defeat**: General HP drops to 0.
- **Termination**: `isOver(state) === true`.
