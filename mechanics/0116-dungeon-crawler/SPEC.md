# Rogue Depths (0116 — Dungeon Crawler)

## Rules
Delve into a 3-floor procedural dungeon grid (`7 × 7`), battling subterranean fiends, looting treasure vaults, and descending stone stairways.
- **Hero Stats**: `hp` (`30`), `maxHp` (`30`), `atk` (`6`), `potions` (`1`), `gold` (`0`).
- **Tiles**:
  - `.` Empty Floor (passable)
  - `#` Stone Wall (impassable)
  - `M` Monster (bump to attack for `hero.atk`; counter-attacks for `monster.atk` if alive)
  - `$` Treasure Chest (`+30` gold and score)
  - `H` Healing Potion (`+1` potion item)
  - `>` Stone Stairs (descends to next floor; Floor 3 exit wins the game)
- **Fog of War**: Unvisited tiles remain shrouded in darkness until illuminated within a 2-tile radius of the hero.
- **Actions**:
  - `['up', 'down', 'left', 'right']`: step or bump-attack into adjacent tile.
  - `'potion'`: consumes a potion to heal `+15` HP (clamped at `maxHp`).
- **Game Over & Victory**:
  - Defeat occurs if `hero.hp <= 0`.
  - Conquering Floor 3 awards a `+500` dungeon master bonus.
  - Concludes at `MAX_STEPS = 600`.

## State
- `grid`: array of 49 integers / characters representing tile content
- `revealed`: array of 49 booleans (fog-of-war)
- `monsters`: array of `{ idx, hp, maxHp, atk, type }`
- `hero`: `{ x, y, hp, maxHp, atk, potions, gold }`
- `floor`: integer `1..3`
- `points`: integer `>= 0`
- `won`: boolean
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
`['up', 'down', 'left', 'right', 'potion']` while `!isOver(state)`; `[]` when over.

## Score
`state.points`
