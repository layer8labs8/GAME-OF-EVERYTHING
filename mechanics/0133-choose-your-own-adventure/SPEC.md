# 0133-choose-your-own-adventure: Paths of Destiny

A classic Steve Jackson & Ian Livingstone Fighting Fantasy style branching gamebook adventure set in the Citadel of Shadows (Kar-Drakis). Players navigate branching narrative passages, test their Luck and Skill, manage Stamina and Provisions, solve inventory gatekeeper puzzles, and conquer the Iron Colossus to claim the legendary Crown of Kar-Drakis.

## Core Mechanics

- **Passage Graph & Narrative Branching**:
  - Interconnected story sections with descriptive text and 2-4 contextual choices per node.
  - Non-linear flow through Watchtowers, Battlement precipices, Courtyard crossroads, Garden of Thorns, Subterranean Crypts, and the Great Hall of the Iron King.
- **Attributes & Character Sheet**:
  - `stamina` / `maxStamina`: Physical health (Starting: 24/24). Reaching 0 triggers defeat.
  - `skill`: Combat aptitude and dexterity (Starting: 10).
  - `luck`: Fortune score (Starting: 10). Testing luck rolls 2d6; success grants advantageous outcomes, while each test expends 1 Luck point.
  - `provisions`: Healing rations (Starting: 3). Consuming a ration recovers 6 Stamina.
  - `inventory`: Key items collected across passages (`brass_key`, `moon_orchid`, `silver_runestone`).
- **Interactive Story Choices**:
  - Navigational choices: e.g. `choice:scale_battlement`, `choice:descend_crypt`, `choice:enter_hall`.
  - Environmental skill & luck tests: e.g. `choice:test_luck_balance`, `choice:force_doors`.
  - Item-gated actions: e.g. `choice:banish_wraith` (requires `moon_orchid`), `choice:unlock_portal` (requires `brass_key` and `silver_runestone`).
  - Sustenance: `action:eat_ration`.
- **Combat Sequences**:
  - Narrative combat against Shadow Imps, Spectral Wraith, and the Iron Colossus boss.
  - Combat choices: `fight:strike`, `fight:test_luck` (critical hit if lucky, glancing hit if unlucky), `fight:flee`.
- **Victory & Defeat**:
  - Victory: Slay the Iron Colossus and ascend the Victory Throne (`victory_throne`).
  - Defeat: Stamina drops to 0.
  - Finite Termination: 150 turns max guarantee.

## State Schema
- `seed`: integer
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `passageId`: string identifier of the current story node
- `stamina`, `maxStamina`: integers
- `skill`: integer
- `luck`: integer
- `provisions`: integer
- `inventory`: array of string IDs (`brass_key`, `moon_orchid`, `silver_runestone`)
- `enemy`: null or object { id, name, hp, maxHp, skill, dmg, isBoss }
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized gamebook state.
- `legalActions(state)`: Returns non-empty list of available narrative and tactical choices.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Boolean game completion check.
- `score(state)`: Numeric score evaluator.
