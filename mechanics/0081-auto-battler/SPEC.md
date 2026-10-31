# 0081-auto-battler: Auto Battler Arena

A tactical 8-round auto-battler. Build an economy, recruit heroes from a rotating shop, merge three duplicates into 2-star titans, assemble synergistic traits, and deploy your warband into automated combat against rival commanders.

## Core Rules & Features
- **Commander Stats & Economy**:
  - Both Player and AI start with 50 Commander HP.
  - Base income: 5 Gold per round + interest (1 gold per 10 unspent gold, up to +3).
  - XP & Levels: Level determines maximum board size (starts at Level 2, up to Level 6). 4 Gold purchases 4 XP.
- **Shop & Star Upgrades**:
  - Each round presents 3 champions with varying costs and traits.
  - Shop reroll costs 1 Gold (`reroll`).
  - **Triple Merge**: Collecting 3 identical 1-star copies automatically fuses them into a 2-star champion with doubled HP and increased attack power.
  - Bench capacity: 4 reserved slots. Board capacity: equal to current player level.
- **Traits & Synergies**:
  - **Warrior** (2+ units): Grants all team members +15 Shield armor.
  - **Mage** (2+ units): Increases ultimate ability damage by +50%.
  - **Assassin** (2+ units): Grants +25% critical strike chance.
- **Automated Combat Phase (`fight`)**:
  - Once prep is complete, `fight` resolves the clash between deployed frontline/backline units.
  - Units auto-attack opposing frontline units, gain mana on hit, and unleash signature ultimates.
  - Round loser incurs damage to commander HP proportional to surviving enemy units (3 base + 2 per survivor).
- **Bot Contract**:
  - `createState(seed)`: Initializes economy, champion pools, shop, and starting bench.
  - `legalActions(state)`: Returns valid actions during shop prep (`buy:*`, `deploy:*`, `bench:*`, `reroll`, `level_up`, `sell:*`, `fight`).
  - `step(state, action)`: Applies player economy action or simulates automated battle round when `fight` is called. Returns `{ reward, done }`.
  - `isOver(state)`: Returns true if commander HP reaches 0, round 8 concludes, or step limit reached.
  - `score(state)`: Player commander HP and team board power.
