# 0059: Organizing - Tidy Bento

A cozy and satisfying spatial packing puzzle. The player organizes diverse geometric bento delicacies into compartmentalized lunchboxes, rotating and arranging polyomino ingredients to achieve a harmonious, perfectly packed bento.

## Core Rules

1. **Bento Box Grid**:
   - $4 \times 4$ grid of 16 individual compartment cells.
   - Cells are either empty (`null`) or occupied by an ingredient cell ID.

2. **Bento Ingredients (Polyominoes)**:
   - Each stage supplies a pantry tray of distinct culinary items:
     - Onigiri ($2 \times 2$ square)
     - Tamagoyaki ($1 \times 2$ domino)
     - Salmon Nigiri ($2 \times 1$ domino)
     - Tempura Shrimp (3-cell L-tromino)
     - Avocado Roll ($1 \times 3$ triomino)
     - Chicken Katsu (4-cell T-tetromino)
     - Edamame & Pickled Plums ($1 \times 1$ monominoes)
   - Every stage's total ingredient cell count exactly matches the 16 cells of the bento box.

3. **Actions**:
   - `place:slot,x,y`: Positions the piece from tray `slot` into the bento box at top-left coordinates $(x, y)$. Legal only if all constituent cells fit within the $4 \times 4$ boundary and do not overlap existing items.
   - `rotate:slot`: Rotates the unplaced piece in tray `slot` by $90^\circ$ clockwise.
   - `remove:slot`: Removes a previously placed piece from the bento box back to the tray.
   - `clear`: Returns all placed pieces back to the tray.

4. **Progression & Scoring**:
   - A stage is completed when all ingredients in the pantry tray are legally packed into the bento box.
   - 3 consecutive bento recipes of escalating geometric complexity.
   - Move budget: 50 moves per stage.
   - Victory: Successfully complete all 3 bento boxes.
   - Defeat: Exceeding move budget (`moves >= maxMoves`).
   - `score = stagesCompleted * 500 + placedPieces * 25 + (won ? 500 : 0) - totalMoves`.
