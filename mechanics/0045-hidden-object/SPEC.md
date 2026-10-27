# 0045: Hidden Object - Relic Seeker

An atmospheric Victorian study / curiosity cabinet hidden-object puzzle game. The player assumes the role of an antiquarian researcher searching cluttered chambers, open shelves, mahogany cabinets, and velvet curtains to find and catalog specific target relics before their investigation lamp runs out of oil.

## Core Rules

1. **Scene & Grid**:
   - $8 \times 8$ grid of sectors representing zones in the curiosity chamber.
   - Contains 16 total antique artifacts:
     - 5 Target Relics specified in the antiquarian checklist.
     - 11 Distraction Antiquities scattered across the chamber.
   - 3 Concealing Containers / Obstacles:
     - `mahogany_cabinet`: houses a hidden item inside.
     - `velvet_curtain`: covers an alcove shelf.
     - `brass_chest`: locked relic trunk requiring uncovering.

2. **Artifact State & Concealment**:
   - Each artifact possesses:
     - `id`: unique integer ($0..15$).
     - `name`: artifact title (e.g. "Golden Scarab", "Brass Compass", "Crystal Prism").
     - `x`, `y`: grid coordinates ($0..7$).
     - `isTarget`: boolean flag.
     - `found`: boolean flag (initially `false`).
     - `containerId`: string id of concealing container, or `null` if in plain view.
   - An artifact inside a closed container cannot be inspected/collected until the container is opened via `uncover:<containerId>` or inspecting its coordinate.

3. **Resources & Limits**:
   - `turnsLeft`: 30 investigation turns (lamp oil).
   - `hintsLeft`: 3 magnifying glass radar charges.
   - `misclicks`: count of fruitless searches.
   - Target quota: all 5 target relics must be found.

4. **Actions**:
   - `inspect:x:y`: investigates coordinate $(x, y)$.
     - If an unfound target relic is at $(x, y)$ and not concealed: marks relic as `found`, increments `foundCount`, awards +100 points.
     - If a closed container is at $(x, y)$: opens the container, revealing any hidden relic inside, awards +25 points.
     - If an uncollected distraction item or empty space is inspected: records a misclick, deducts 1 turn, penalty -5 points.
   - `uncover:<containerId>`: opens the specified container (`"mahogany_cabinet"`, `"velvet_curtain"`, `"brass_chest"`), exposing contents. Deducts 1 turn.
   - `use_hint`: consumes 1 hint charge to reveal the exact $(x, y)$ location and name of an unfound target relic. Awards +15 points. Does not consume a turn.

5. **Scoring & End Conditions**:
   - `score = foundCount * 200 + hintsLeft * 50 + turnsLeft * 15 - misclicks * 20 + (won ? 500 : 0)`.
   - Victory: all 5 target relics are found (`foundCount === targetRelics.length`).
   - Defeat: `turnsLeft <= 0` while target relics remain undiscovered.
