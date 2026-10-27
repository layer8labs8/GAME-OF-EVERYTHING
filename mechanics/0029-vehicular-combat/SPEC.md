# 0029: Vehicular Combat - Metal Carnage

An arena-based demolition vehicular combat game inspired by *Twisted Metal*, *Vigilante 8*, and *Crossout*. The player pilots an armored battle-rig equipped with twin autocannons, swivel rockets, deployable proximity mines, nitro thrusters, and a spiked cowcatcher ramming bumper inside an enclosed wasteland arena.

## Core Rules

1. **Battle-Rig Mechanics**:
   - The vehicle operates in a 2D arena ($400 \times 400$) bounded by reinforced barricade walls.
   - Orientation is tracked as discrete headings (8 cardinal and ordinal directions: 0 = East, 1 = SE, 2 = South, 3 = SW, 4 = West, 5 = NW, 6 = North, 7 = NE).
   - Stats:
     - `armor`: 100 max ablative armor (absorbs incoming damage before hull is compromised).
     - `hull`: 100 max structural health.
     - `speed`: current velocity (0 to 6 units per turn; negative for reverse).
     - `nitro`: 100 max nitro boost reservoir (+5 passive recovery per turn).
     - `ammo`: 60 max autocannon ammunition.
     - `rockets`: 4 heavy swivel rockets.
     - `mines`: 3 magnetic proximity mines.
     - `scrap`: collected salvage parts used for field repairs.

2. **Actions**:
   - `accelerate`: throttles forward ($\text{speed} \gets \min(6, \text{speed} + 2)$) and advances craft along current heading.
   - `reverse`: backs up ($\text{speed} \gets \max(-2, \text{speed} - 2)$) and shifts backward.
   - `steer_left`: rotates vehicle heading counter-clockwise by 45° and moves forward.
   - `steer_right`: rotates vehicle heading clockwise by 45° and moves forward.
   - `fire_cannons`: discharges twin frontal machine guns along vehicle heading, dealing 25 damage to enemies in firing arc. Consumes 4 ammo. Legal if `ammo >= 4`.
   - `fire_rocket`: launches tracking rocket toward the nearest hostile combatant, dealing 60 explosive damage. Consumes 1 rocket. Legal if `rockets > 0`.
   - `deploy_mine`: drops proximity mine behind the craft. Explodes for 80 damage when an enemy drives within trigger radius. Consumes 1 mine. Legal if `mines > 0`.
   - `nitro_boost`: consumes 25 nitro to surge forward at maximum speed ($\text{speed} = 8$), dealing devastating ramming impact ($40 + \text{speed} \times 10$ damage) upon collision. Legal if `nitro >= 25`.
   - `handbrake_turn`: executes sharp 90° pivot slide without losing forward momentum. Consumes 15 nitro. Legal if `nitro >= 15`.
   - `repair_armor`: expends 20 salvage scrap to restore +35 armor. Legal if `scrap >= 20 && armor < maxArmor`.

3. **Enemies & Combatants**:
   - **Raider Buggies**: Fast, agile vehicles with light armor (40 HP) and rapid-fire peashooters.
   - **Scrap Crushers**: Heavily armored trucks (80 HP) attempting aggressive ramming charges.
   - **War Rig Flagship**: Demolition boss (200 HP) arriving in wave 3 with dual swivel turrets.
   - Destroyed vehicles drop salvage scrap crates (+15 scrap, ammo restock).

4. **Victory & Defeat**:
   - **Victory**: Destroy all 3 waves of wasteland hostiles including the War Rig Flagship.
   - **Defeat**: Player hull reduced to 0 (vehicle explodes), or turn limit reached (`MAX_STEPS = 120`).
