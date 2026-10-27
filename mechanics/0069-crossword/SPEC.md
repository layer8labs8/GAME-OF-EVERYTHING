# 0069: Crossword - LexiCross

An elegant, scholar-themed mini crossword puzzle. Players decipher Across and Down vocabulary clues, placing intersecting letters into interlocking word grids across three escalating stages.

## Core Rules

1. **Crossword Grid & Clues**:
   - Compact symmetric word grids where horizontal Across words intersect with vertical Down words:
     - Stage 1: $4 \times 4$ "Harbor Haven" (SHIP, HERO, IRON, POND)
     - Stage 2: $4 \times 4$ "Winter Stroll" (SNOW, NOVA, OVAL, WALK)
     - Stage 3: $5 \times 5$ "Heart & Hearth" (HEART, EMBER, ABUSE, RESIN, TREND)
   - Each row and column corresponds to a specific vocabulary definition.

2. **Letter Bank & Insertion**:
   - A curated pool of letters (including all target characters plus thematic distractors) is provided in the artisan letter rack.
   - Letters can be placed into empty grid cells or replaced.
   - Placed letters can be cleared back to empty.
   - Clue hints can be invoked to reveal a stubborn letter slot.

3. **Actions**:
   - `set:r,c,LETTER`: Places the specified character from the letter bank into cell $(r, c)$.
   - `delete:r,c`: Erases the character from cell $(r, c)$.
   - `reveal:r,c`: Consumes a hint charge to fill the correct character into $(r, c)$.
   - `check`: Validates grid progress.

4. **Progression & Scoring**:
   - Stage is solved when all grid cells are filled with the correct letters.
   - Solving a stage awards 300 points and advances to the next crossword.
   - Completing all 3 crossword stages triggers Victory.
   - Move limit: 60 moves per stage.
   - Defeat: Exceeding move budget (`moves >= maxMoves`).
   - `score = (stage - 1) * 300 + correctLetters * 10 + completedWords * 50 + (won ? 1000 : 0) - (hintsUsed * 25) - totalMoves`.
