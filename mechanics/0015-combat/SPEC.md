# 0015 - Combat ("Brawler Strike")

## Concept & Theme
A gritty martial arts hand-to-hand combat arena. Fighting in underground fight rings, players execute precise striking martial disciplines, dynamic stance switches (High Stance vs Low Stance), devastating grab-and-throw takedowns, tactical parry-counters, and crowd control against escalating rings of brawlers, kickboxers, and the reigning pit champion.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes fighter with 100 HP, 100 stamina, High Stance, combo streak 0, against Ring 1 combatants.
- `legalActions(state)`: Returns valid martial arts actions based on current stamina and stance.
- `step(state, action)`: Mutates state in place, executes strikes/throws/parries, advances opponents, resolves ring clears, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if player HP reaches 0, the Pit Champion in Ring 3 is defeated, or max step limit reached.
- `score(state)`: Returns score based on combo multiplier, counter-parry executions, knockouts, and champion slay bonus.

## Actions
- `jab`: Lightning fast straight punch (8 damage, 5 stamina, builds +1 combo streak).
- `heavy_kick`: High impact roundhouse strike in High Stance (24 damage, 15 stamina, breaks guard).
- `sweep`: Low sweeping trip kick in Low Stance (16 damage, 12 stamina, knocks down targets).
- `grab_throw`: Grapples adjacent opponent, slamming them into the mat and stunning nearby foes (30 damage, 20 stamina).
- `counter_parry`: Defensive deflection stance; if attacked this turn, nullifies damage and executes an instant 35 damage counter-strike (10 stamina).
- `shift_stance`: Seamlessly switches between High Stance (punch/kick focus) and Low Stance (sweep/dodge focus).
- `dodge`: Quick tactical retreat evading all enemy strikes this turn (10 stamina).
- `breathe`: Martial breathing focus recovering 40 stamina up to 100 maximum.

## Opponents
- **Pit Brawlers**: Reckless street fighters with looping hooks (30 HP, 8 damage).
- **Kickboxers**: Fast fighters with spinning kicks (50 HP, 14 damage).
- **Pit Champion "Iron Fang"**: Armored heavy brawler with devastating haymakers (120 HP, 25 damage, telegraphed strikes).

## Victory & Defeat
- **Victory**: Clear all 3 fight rings and defeat Pit Champion "Iron Fang".
- **Defeat**: Player HP drops to 0 or step limit (160 steps) expires.
