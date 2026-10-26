# 0145-farming-sim: Harvest Haven

Simulation farming game where players clear land, till soil, plant diverse crops, irrigate, harvest produce, trade at the local market, and manage daily stamina across seasons.

## State
- `grid`: Array of 9 plot objects `{ id, status, crop, growth, watered }`
  - `status`: `'wild'` (weeds/rocks), `'tilled'`, `'planted'`, `'ripe'`
  - `crop`: `null` | `'wheat'` | `'carrot'` | `'berry'`
  - `growth`: integer current growth stage
  - `watered`: boolean
- `day`: integer (starts at 1, max 20)
- `stepCount`: integer (max 200)
- `energy`: integer (0 to 100, starts at 100)
- `coins`: integer (starts at 40)
- `weather`: `'sunny'` | `'rainy'`
- `inventory`: `{ wheat: number, carrot: number, berry: number }`
- `seeds`: `{ wheat: number, carrot: number, berry: number }`
- `stats`: `{ totalHarvested: number, totalEarned: number }`
- `rng`: integer seed for deterministic PRNG

## Actions
- `{ type: 'clear', plot: number }`: removes wild brush from plot (costs 5 energy)
- `{ type: 'till', plot: number }`: tills soil on empty plot (costs 3 energy)
- `{ type: 'plant', plot: number, crop: string }`: plants seed from stock (costs 2 energy)
- `{ type: 'water', plot: number }`: waters a planted plot (costs 3 energy)
- `{ type: 'harvest', plot: number }`: collects ripe harvest into inventory (costs 3 energy)
- `{ type: 'sell', crop: string }`: sells all crops of given type at market for coins
- `{ type: 'buy_seed', crop: string }`: purchases seed using coins
- `{ type: 'rest' }`: ends current day, restores 50 energy, advances crops, updates weather

## Game Over & Scoring
- Game ends when `day > 20` or `stepCount >= 200`.
- Score = `coins + stats.totalHarvested * 15 + stats.totalEarned`.
