# 0110-action-rpg: Blade & Spell

An action-oriented role-playing combat simulator featuring real-time spatial maneuvering on an 8x8 dungeon arena, stamina-managed dodge rolls, melee slash combos, arcane spellcasting, and telegraphed enemy attack windups.

## Core Rules & Features
- **Arena & Hero Mechanics**:
  - 8x8 combat arena (`x: 0..7, y: 0..7`).
  - Hero stats: 100 HP, 100 Stamina (regenerates +15/turn), 50 Mana.
  - Directional facing: `N` (up), `E` (right), `S` (down), `W` (left).
- **Hero Actions & Abilities**:
  - `move:{dir}`: Advances 1 tile in cardinal direction (`N`, `E`, `S`, `W`). Stamina cost: 0.
  - `dodge_roll:{dir}`: Lunges 2 tiles in cardinal direction with invulnerability frames. Stamina cost: 20.
  - `slash`: Sweeps forward arc in front of hero facing vector. Deals 18 DMG, costs 15 Stamina.
  - `spin_cleave`: 360-degree whirlwind hitting all adjacent tiles. Deals 28 DMG, costs 35 Stamina.
  - `cast_frost_nova`: Freezes and damages all enemies in a 2-tile radius. Deals 22 DMG, costs 20 Mana.
  - `heal_flask`: Restores 40 HP (2 charges).
- **Telegraphed Combat & Enemy AI**:
  - Enemies have telegraphed attack windups. When adjacent, they enter a 1-turn windup state (`windup: true`).
  - If the player remains in the targeted tile on the subsequent turn without executing a `dodge_roll`, the strike lands.
  - Players must read telegraphs, dodge through attacks, and punish openings.
- **Wave Progression**:
  - Wave 1: 3x Skeleton Grunts (30 HP, 12 DMG).
  - Wave 2: 2x Shadow Cultists (40 HP, ranged bolts) + 2x Skeleton Grunts.
  - Wave 3: Cryptlord Minotaur (140 HP, crushing cleave & charge).
- **Termination & Score**:
  - **Victory**: Slay all 3 waves including the Cryptlord Minotaur.
  - **Defeat**: Hero HP reduced to 0, or steps exceed `MAX_STEPS = 60`.
  - **Score**: Sunk enemy casualties, boss bonus, remaining health, and combo bonus.
- **Bot Contract**:
  - `createState(seed)`: Initializes hero, stats, and wave 1 grunts.
  - `legalActions(state)`: Returns valid movement, dodge rolls, sword strikes, spells, and flask heals.
  - `step(state, action)`: Applies player action, evaluates enemy windups and attacks, returns `{ reward, done }`.
  - `isOver(state)`: Returns boolean terminal state.
  - `score(state)`: Evaluates battle efficiency and survival.
