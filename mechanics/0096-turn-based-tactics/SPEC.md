# 0096-turn-based-tactics: X-Vanguard (Turn-Based Tactics)

A turn-based squad tactics (TBT / XCOM-style) battle simulator played on an 8x8 urban combat grid with half/full cover mitigation, 2 Action Point (AP) economy, reactive Overwatch ambushes, flanking crits, and alien squad skirmishes.

## Core Rules & Features
- **8x8 Battlefield & Cover**:
  - Open Ground: No defensive protection.
  - Half Cover (Low barricades): -20% hit chance to incoming shots.
  - Full Cover (Reinforced blast walls): -40% hit chance and line-of-sight obstruction.
  - Flanking: When firing at an enemy whose cover does not face the attacker, attacker bypasses cover defense and scores +30% critical strike chance.
- **2-Action Point (AP) Economy**:
  - Each living operative starts every round with 2 AP.
  - Movement costs 1 AP (up to movement range).
  - Standard Fire costs 1 AP.
  - Special actions:
    - `frag_grenade`: Deals 35 guaranteed area damage, bypasses cover, demolishes barricades (1 charge).
    - `overwatch`: Operative holds sector, automatically reaction-firing at any enemy that maneuvers into visual range during the enemy turn.
    - `field_medkit`: Restores 35 HP to adjacent wounded ally (2 charges).
  - `end_turn`: Ends player phase, resets AP, and triggers the Alien AI reaction and offensive phase.
- **Squad Rosters**:
  - **Player Vanguard**:
    - Assault ("Striker"): 70 HP, Shotgun (35 dmg, Range 2). Frag Grenade.
    - Sniper ("Ghost"): 50 HP, Sniper Rifle (45 dmg, Range 5). Overwatch specialist.
    - Support ("Doc"): 60 HP, Assault Rifle (25 dmg, Range 3). Medkit.
  - **Alien Syndicate**:
    - 2x Sectoid Troopers (40 HP each, Range 3, 20 dmg).
    - 1x Berserker Mech (90 HP, Range 2, 35 dmg).
- **Simulation Loop & AI Reaction**:
  - Alien AI utilizes cover, flanks exposed operatives, shoots vulnerable targets, or retreats behind full cover when wounded.
- **Victory & Defeat**:
  - **Total Squad Victory**: Neutralizing all alien hostiles.
  - **Mission Defeat**: All 3 vanguard operatives neutralized.
  - **Timeout (20 Rounds)**: Evaluated by surviving operatives and alien casualties inflicted.
- **Bot Contract**:
  - `createState(seed)`: Initializes grid, cover barricades, squad positioning, and action point pools.
  - `legalActions(state)`: Produces array of legal AP commands (`move:*`, `shoot:*`, `frag_grenade:*`, `overwatch:*`, `field_medkit:*`, `end_turn`).
  - `step(state, action)`: Applies tactical orders, evaluates hit/crit chances deterministically via seeded PRNG, triggers overwatch reactions, and resolves alien counter-actions. Returns `{ reward, done }`.
  - `isOver(state)`: Checks whether all hostiles or all operatives are eliminated.
  - `score(state)`: Evaluates alien casualties, health preserved, and victory bonus.
