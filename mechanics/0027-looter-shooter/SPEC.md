# 0027 - Looter Shooter ("Rogue Armory")

## Concept & Theme
A gritty tactical looter-shooter set inside an abandoned planetary weapon vault. Operatives clear hostile automated scavengers, open high-tier weapon caches, scavenge modular firearm upgrades across 4 rarity tiers (Common, Rare, Epic, Legendary), upgrade kinetic shields, and extract with prime loot.

## Bot Contract
Exports deterministic functions:
- `createState(seed)`: Initializes operative with Common Pistol (12 damage, 10 clip), 100 HP, 50 Shield, in Room 1.
- `legalActions(state)`: Returns valid tactical maneuvers, weapon discharges, loot cache equips, reloads, and extraction.
- `step(state, action)`: Mutates state in place, executes player action, updates loot drops, resolves enemy retaliations, advances rooms, and returns `{ reward, done }`.
- `isOver(state)`: Returns true if player HP reaches 0, operative extracts safely with prime vault loot, or step limit (160 turns) reached.
- `score(state)`: Returns total points based on rarity of equipped gear, scavenged weapon count, hostiles neutralized, and extraction bonus.

## Actions
- `move_n`, `move_s`, `move_e`, `move_w`: Tactical room navigation (updates coordinates and facing direction).
- `fire`: Fires equipped weapon at the nearest aligned hostile (consumes 1 ammo, deals weapon tier damage).
- `equip_loot`: Equips adjacent dropped weapon cache, replacing current weapon with higher tier gear.
- `reload`: Reloads current weapon magazine to full capacity.
- `use_medkit`: Consumes scavenged nano-injector to restore 40 HP up to 100 max.
- `extract`: Activates extraction beacon when in the Vault Core (Room 4) to escape with accumulated spoils.

## Gear & Rarity Tiers
- **Common (Gray)**: Sub-Compact Pistol (12 damage, 10 clip).
- **Rare (Blue)**: Pulse Rifle (22 damage, 14 clip).
- **Epic (Purple)**: Heavy Shotgun (38 damage, 8 clip).
- **Legendary (Gold)**: Void Railgun (65 damage, 5 clip).

## Victory & Defeat
- **Victory**: Defeat the Vault Warlord in Room 4 and trigger `extract`.
- **Defeat**: Operative HP drops to 0 or step limit expires.
