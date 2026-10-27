# 0129-point-and-click: Blackwood Manor

Classic 90s LucasArts/SCUMM-style point-and-click adventure game featuring verb-driven hotspot interactions (Look, Pick Up, Use, Talk), room navigation across an eerie Victorian estate, inventory item combinations, puzzle solving, and dialogue clues to uncover the Astrolabe of the Cosmos.

## Verbs & Core Mechanics
- **Core Verbs**:
  - `look:<hotspot>`: Inspect an environmental object for narrative clues and hints.
  - `pickup:<item>`: Take an accessible item into inventory.
  - `use_item:<item>:<hotspot>`: Apply an inventory item onto an environmental hotspot.
  - `combine:<itemA>:<itemB>`: Synthesize two inventory items into a new tool.
  - `talk:<npc>`: Converse with characters to obtain puzzle solutions and passwords.
  - `go:<room>`: Travel to connected accessible rooms.
- **Rooms & Hotspots**:
  - **Foyer**: Grandfather Clock, Coat Rack (holds trenchcoat with Brass Key), Locked Study Door, Dusty Rug (hides trapdoor).
  - **Study**: Slumbering Butler, Roll-top Desk (locked with drawer), Bookshelf with false book, Unlit Fireplace.
  - **Laboratory**: Alchemy Still, Acid Flask, Rusted Iron Safe, Worktable with matches.
  - **Observatory**: Celestial Oculus, Star Chart pedestal, Astrolabe Socket.
- **Puzzles**:
  1. Search trenchcoat on coat rack in Foyer to find `brass_key`.
  2. Use `brass_key` to unlock Study Door and enter Study.
  3. Talk to Butler in Study: he sleep-mumbles the Clockwork Sequence (`"Three chimes at midnight"`).
  4. Search desk to find `clock_crank`.
  5. Combine `empty_flask` with `acid_residue` in Laboratory to create `vial_of_acid`.
  6. Use `vial_of_acid` on Rusted Safe in Laboratory to melt lock and obtain `golden_astrolabe`.
  7. Use `clock_crank` on Grandfather Clock in Foyer to open the hidden passage to the Observatory.
  8. Insert `golden_astrolabe` into Celestial Oculus in Observatory to solve the mystery!

## State Schema
- `seed`: integer PRNG seed
- `currentRoom`: string (`'foyer'`, `'study'`, `'laboratory'`, `'observatory'`)
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `inventory`: array of string item IDs
- `world`:
  - `doors`: `{ study_unlocked: bool, lab_unlocked: bool, observatory_open: bool }`
  - `safe_opened`: boolean
  - `clock_wound`: boolean
  - `astrolabe_placed`: boolean
  - `butler_talked`: boolean
- `combatLog`: array of strings

## Actions
- `look:<target>`
- `pickup:<item>`
- `use_item:<item>:<target>`
- `combine:<itemA>:<itemB>`
- `talk:<npc>`
- `go:<room>`

## Scoring & Termination
- **Victory**: Placing the Golden Astrolabe into the Celestial Oculus in the Observatory. Reward: `1.0`.
- **Defeat**: Exceeding 150 turns without solving the mystery. Reward: `0.0`.
- **Score**: `(victory ? 3000 : 0) + inventory.length * 100 + solvedPuzzles * 250 + Math.max(0, 150 - turns) * 5`.
