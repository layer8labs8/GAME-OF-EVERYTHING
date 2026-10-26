# 0162-survival: Frost Outpost

Deterministic survival simulation where players maintain an arctic outpost against lethal blizzards, sub-zero hypothermia, predator attacks, and dwindling fuel before rescue arrives.

## State
- `day`: integer (1 to 20; rescue arrives after day 20)
- `stepCount`: integer (max 200)
- `health`: integer (0 to 100)
- `warmth`: integer (0 to 100)
- `hunger`: integer (0 to 100)
- `fireLevel`: integer (0 to 100, burns 15 fuel each sleep cycle)
- `shelter`:
  - `integrity`: integer (0 to 100)
  - `insulation`: integer (1 to 3)
- `supplies`:
  - `wood`: integer
  - `food`: integer
  - `medical`: integer
  - `scrap`: integer
- `weather`: `'clear'` | `'windy'` | `'blizzard'`
- `threat`: `'none'` | `'wolves'`
- `won`: boolean
- `rng`: integer PRNG seed

## Actions
- `{ type: 'stoke_fire' }`: adds +35 to fireLevel, consumes 3 wood
- `{ type: 'eat' }`: reduces hunger by -35, restores +5 health, consumes 2 food
- `{ type: 'heal' }`: restores +30 health, consumes 1 medical kit
- `{ type: 'forage_wood' }`: scavenges frozen timber (+4-7 wood, +8 hunger, -10 warmth)
- `{ type: 'hunt_food' }`: tracks arctic game (+3-5 food, +1-2 scrap, +10 hunger, -15 warmth)
- `{ type: 'repair_shelter' }`: reinforces shelter walls (+30 integrity, consumes 4 wood, 2 scrap)
- `{ type: 'upgrade_insulation' }`: permanently improves insulation (consumes 8 scrap, 8 wood)
- `{ type: 'defend' }`: neutralizes wolf pack threat using 2 wood for torches / barricades
- `{ type: 'sleep' }`: rests overnight, advances day +1, consumes fire, simulates weather and hypothermia

## Game Over & Scoring
- Game ends when `health <= 0` (death) or `day > 20` or `stepCount >= 200` (rescue).
- Score = `(won ? 500 : 0) + day * 35 + health * 2 + shelter.integrity + totalSupplies * 5`.
