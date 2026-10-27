# 0112-crpg: Grimoire & Steel

A classic computer role-playing game (CRPG) tactical combat simulator featuring an Action Point (AP) economy, 6x6 grid positioning, environmental surface combos (Oil + Fire, Water + Lightning), and squad coordination between an Ironclad Warrior and an Arcane Sorceress.

## Core Rules & Features
- **Tactical Grid & Surfaces**:
  - 6x6 isometric-style battle grid (`r: 0..5, c: 0..5`).
  - Tile Surfaces:
    - `clean`: Standard stone or cobblestone.
    - `oil`: Slows movement (+1 AP cost to enter). Flammable: catching fire converts oil into raging fire!
    - `fire`: Burns occupants for 8 DMG at the start of their activation.
    - `water`: Extinguishes fire. Conductive: lightning spells convert water into electrified shock pools!
    - `electrified`: Shocks occupants, reducing their AP by 2 and dealing 10 shock DMG.
- **Party Composition & Action Points**:
  - Each character starts every turn with 4 Action Points (AP).
  - **Kael (Ironclad Warrior)**: 90 HP.
    - `move:{r,c}`: 1 AP per tile.
    - `slash:{target}`: 2 AP. Deals 20 physical DMG (melee range 1).
    - `shield_bash:{target}`: 2 AP. Deals 14 DMG and shoves target backward 1 tile.
  - **Valeria (Arcane Sorceress)**: 65 HP.
    - `move:{r,c}`: 1 AP per tile.
    - `ignite:{r,c}`: 3 AP. Deals 16 fire DMG and ignites oil puddles into spreading flame.
    - `chain_lightning:{r,c}`: 3 AP. Deals 18 lightning DMG and electrifies water puddles.
- **Enemy Host**:
  - 2x Brigand Marksmen (45 HP, ranged 3-tile bow fire).
  - 1x Mercenary Warlord (80 HP, heavy cleave, high armor).
- **Turn Flow & Flanking**:
  - `end_turn`: Ends the player's tactical activation. Unspent AP does not carry over.
  - Enemy AI moves within their AP budget, attacks closest hero, and avoids standing in fire unless provoked.
  - Flanking bonus: Attacking an enemy with an ally positioned on the opposite side deals +30% critical flanking damage.
- **Termination & Score**:
  - **Victory**: Eliminate all enemy mercenaries.
  - **Defeat**: Both party members reduced to 0 HP, or maximum turns (`MAX_TURNS = 35`) reached.
  - **Score**: Mercenaries defeated, environmental surface combo triggers, remaining HP, and turn speed.
- **Bot Contract**:
  - `createState(seed)`: Initializes grid, oil and water puddles, hero and enemy positions.
  - `legalActions(state)`: Returns valid AP-funded movements, weapon attacks, spells, and end_turn.
  - `step(state, action)`: Applies tactical action, resolves environmental reactions, runs enemy AI on end_turn, returns `{ reward, done }`.
  - `isOver(state)`: Returns boolean terminal state.
  - `score(state)`: Evaluates tactical and strategic achievement.
