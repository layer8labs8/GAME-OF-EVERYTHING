# 0005-bullet-heaven: Horde Survivor

Top-down arena bullet-heaven survivor featuring automated weapon firing, continuous monster hordes, XP gem collection, leveling and weapon evolution, and wave survival.

## State
- `player`:
  - `x`: number (0 to 360)
  - `y`: number (0 to 640)
  - `hp`: integer (0 to 100)
  - `maxHp`: integer (100)
  - `speed`: number (6)
  - `level`: integer (starts at 1)
  - `xp`: integer (starts at 0)
  - `nextXp`: integer (starts at 10)
  - `weapons`:
    - `wand`: `{ level: number, cooldown: number, maxCooldown: number, damage: number }`
    - `aura`: `{ level: number, radius: number, damage: number }`
- `enemies`: array of enemy objects:
  - `{ id, type: 'bat' | 'skeleton' | 'zombie', x, y, hp, maxHp, speed, damage, xpValue }`
- `projectiles`: array of magic missile objects `{ x, y, vx, vy, damage }`
- `gems`: array of collectible XP crystal objects `{ x, y, value }`
- `stepCount`: integer (max 600)
- `kills`: integer
- `won`: boolean
- `rng`: integer PRNG state

## Actions
- Movement actions:
  - `'up'`, `'down'`, `'left'`, `'right'`
  - `'up_left'`, `'up_right'`, `'down_left'`, `'down_right'`
  - `'wait'`

## Weapon & Swarm Mechanics
- **Magic Wand**: Fires a seeking magic missile at the nearest enemy whenever cooldown resets.
- **Holy Aura**: Radiates a persistent circular barrier around the player, continuously damaging any enemies within radius.
- **XP Progression**: Slaying an enemy spawns an XP crystal at its position. Stepping within vacuum radius attracts and collects the gem.
- **Level Up**: When `xp >= nextXp`, level advances, healing +20 HP, increasing weapon power, and raising `nextXp`.
- **Horde Escalation**: Swarm density and enemy toughness increase with survival time.

## Game Over & Scoring
- Run terminates when `player.hp <= 0` (death), `stepCount >= 600` (dawn arrives, victory!), or `won === true`.
- Score = `(won ? 1000 : 0) + kills * 25 + player.level * 100 + player.xp * 5 + stepCount * 2`.
