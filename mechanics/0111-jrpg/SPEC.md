# 0111-jrpg: Crystal Echoes

A classic turn-based Japanese RPG (JRPG) combat simulator featuring a 3-member party (Warrior, Black Mage, White Mage), elemental affinity exploitation (Fire, Blizzard, Thunder), Shield Break / Stagger mechanics, and a cinematic Limit Break gauge.

## Core Rules & Features
- **Party Composition**:
  - **Aiden (Knight)**: 120 HP, 35 MP. Role: Physical heavy strikes, defense, Taunt guard, and physical Limit Break.
  - **Lyra (Black Mage)**: 75 HP, 80 MP. Role: Elemental offensive sorcery (`fire`, `blizzard`, `thunder`).
  - **Rowan (White Mage)**: 85 HP, 75 MP. Role: Restoration hymns (`cure`, `holy`, `revive`).
- **Elemental Affinities & Stagger (Break) System**:
  - Enemies possess elemental vulnerabilities (`fire`, `ice`, `lightning`).
  - Striking an enemy with their vulnerable element decreases their Shield counter.
  - When an enemy's Shield reaches 0, they become **Staggered**: they take 2x critical damage and their next turn action is cancelled. Shield recovers to full on the subsequent turn.
- **Limit Break Meter (0..100)**:
  - Filled by receiving enemy damage (+12 per strike) and shattering shields (+15 per break).
  - At 100%, any party member can unleash a devastating Limit Break (`limit_break`):
    - Aiden: *Omni-Slash* (Massive single-target physical carnage).
    - Lyra: *Cataclysm Meteor* (Devastating elemental spell hitting all foes).
    - Rowan: *Aura of Rebirth* (Fully heals entire party and cures all ailments).
- **Boss Gauntlet**:
  - Battle 1: Frost Stalker (Ice affinity, weak to Fire) + Flame Wisp (Fire affinity, weak to Ice).
  - Battle 2: Storm Wyvern (Lightning affinity, weak to Ice) + Magitek Golem (Machine, weak to Lightning).
  - Battle 3: Prime Ancient Behemoth (Boss, 260 HP, shifting elemental weaknesses, telegraphed Meteor countdown).
- **Termination & Score**:
  - **Victory**: Slay the Prime Ancient Behemoth in Battle 3.
  - **Defeat**: Entire 3-member party wiped out (0 HP).
  - **Score**: Battles cleared, enemies broken/staggered, remaining party HP, and turn speed bonus.
- **Bot Contract**:
  - `createState(seed)`: Initializes party, abilities, and battle 1 encounter.
  - `legalActions(state)`: Returns valid skills and target selections for the currently active character.
  - `step(state, action)`: Resolves action, manages stagger states, advances turn queue, returns `{ reward, done }`.
  - `isOver(state)`: Returns boolean terminal state.
  - `score(state)`: Evaluates tactical efficiency and survival.
