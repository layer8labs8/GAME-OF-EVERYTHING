# 0121-roguelike: Abyssal Crypt

Turn-based tactical roguelike featuring procedural floor layouts, permadeath, enemy combat AI, relic draft synergies, and 5 depths of dungeon progression.

## State
- `floor`: integer (1 to 5; descending floor 5 stairs achieves victory)
- `stepCount`: integer (max 250)
- `hero`:
  - `x`: integer (0 to 7)
  - `y`: integer (0 to 7)
  - `hp`: integer (0 to 40)
  - `maxHp`: integer
  - `atk`: integer
  - `def`: integer
  - `gold`: integer
  - `potions`: integer (max 3)
  - `relics`: array of strings (`'vampiric_fang'`, `'spiked_shield'`, `'firebrand'`, `'swift_boots'`)
- `map`: 8x8 grid of characters (`'#'` wall, `'.'` floor, `'>'` stairs, `'A'` altar)
- `enemies`: array of enemy objects `{ id, type, x, y, hp, maxHp, atk, def }`
- `items`: array of item objects `{ id, type: 'gold' | 'potion' | 'relic', x, y, relicName }`
- `fog`: 8x8 boolean grid of revealed tiles
- `stats`: `{ kills: number, damageDealt: number }`
- `won`: boolean
- `rng`: integer PRNG state

## Actions
- `'move_up'`, `'move_down'`, `'move_left'`, `'move_right'`: moves hero or attacks adjacent enemy (bump combat)
- `'use_potion'`: consumes a healing potion to restore 20 HP
- `'pray_altar'`: sacrifices 6 HP at altar for permanent +2 ATK or +2 DEF upgrade
- `'descend'`: takes stairs to next floor when standing on `'>'`
- `'wait'`: passes turn, allowing enemies to advance or attack

## Combat & Relics
- Standard damage = `Math.max(1, attacker.atk - defender.def)`.
- If hero possesses `'vampiric_fang'`: slaying an enemy restores +3 HP.
- If hero possesses `'spiked_shield'`: taking damage retaliates with 2 direct thorn damage.
- If hero possesses `'firebrand'`: hero attacks inflict +2 bonus fire damage.
- If hero possesses `'swift_boots'`: 25% chance to dodge enemy strikes entirely.

## Game Over & Scoring
- Run terminates when `hero.hp <= 0` (permadeath), `won === true` (cleared floor 5), or `stepCount >= 250`.
- Score = `(won ? 1000 : 0) + floor * 150 + stats.kills * 30 + hero.relics.length * 50 + hero.gold`.
