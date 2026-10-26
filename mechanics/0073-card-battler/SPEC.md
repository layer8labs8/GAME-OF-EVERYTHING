# 0073-card-battler: Spell & Blade

Turn-based tactical deck card battler featuring energy management, telegraphed enemy intents, block defense mechanics, card drafting, and 3 progressive dungeon encounters.

## State
- `encounter`: integer (1 to 3; defeating encounter 3 achieves victory)
- `stepCount`: integer (max 150)
- `hero`:
  - `hp`: integer (0 to 45)
  - `maxHp`: 45
  - `energy`: integer (0 to 3)
  - `maxEnergy`: 3
  - `block`: integer (shields against incoming attacks)
  - `hand`: array of card objects `{ id, type, name, cost, effect }`
  - `drawPile`: array of card objects
  - `discardPile`: array of card objects
- `enemy`:
  - `name`: string
  - `hp`: integer
  - `maxHp`: integer
  - `block`: integer
  - `intent`: `{ type: 'attack' | 'defend' | 'buff', value: number }`
- `won`: boolean
- `stats`: `{ damageDealt: number, damageBlocked: number }`
- `rng`: integer PRNG state

## Actions
- `{ type: 'play', cardIndex: number }`: plays card from hand at index if `hero.energy >= card.cost`
- `{ type: 'end_turn' }`: concludes hero turn, triggers enemy telegraphed action, draws new hand for next turn

## Cards Catalog
- `'strike'`: Cost 1, Deal 6 damage
- `'defend'`: Cost 1, Gain 5 block
- `'heavy_slash'`: Cost 2, Deal 14 damage
- `'iron_barrier'`: Cost 2, Gain 12 block
- `'fireball'`: Cost 2, Deal 11 damage
- `'quick_strike'`: Cost 0, Deal 4 damage
- `'heal'`: Cost 1, Restore 7 HP

## Game Over & Scoring
- Run concludes upon victory (`encounter > 3` or `won === true`), death (`hero.hp <= 0`), or `stepCount >= 150`.
- Score = `(won ? 1000 : 0) + (encounter - 1) * 300 + hero.hp * 15 + stats.damageDealt * 5`.
