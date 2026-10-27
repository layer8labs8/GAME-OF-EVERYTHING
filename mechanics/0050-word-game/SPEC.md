# 0050: Word Game - Word Forge

A tactical grid-based word crafting puzzle game inspired by *Bookworm* and *Boggle*. Letters rest upon a $4 \times 4$ cascading grid. Players forge words by connecting horizontally, vertically, or diagonally adjacent letter tiles. As words are forged, tiles disintegrate, surviving tiles collapse downward under gravity, and fresh letters drop in from the reserve to form new combinations.

## Core Rules

1. **Board & Tiles**:
   - $4 \times 4$ grid (16 tiles).
   - Letter frequencies match standard linguistic distributions with weighted vowels and consonants.
   - Each letter carries a point value:
     - 1 pt: A, E, I, O, U, L, N, S, T, R
     - 2 pts: D, G
     - 3 pts: B, C, M, P
     - 4 pts: F, H, V, W, Y
     - 5 pts: K
     - 8 pts: J, X
     - 10 pts: Q, Z

2. **Word Formation & Adjacency**:
   - Words must consist of at least 3 letters.
   - Successive letters must be adjacent in the grid (Chebyshev distance 1: horizontal, vertical, or diagonal).
   - A single tile cannot be used more than once in the same word.
   - Word must exist in the recognized game lexicon.

3. **Cascading Grid Dynamics**:
   - When a valid word is forged, its tiles are cleared.
   - Tiles above drop down vertically into empty spaces.
   - Fresh random letters (generated deterministically from the seed PRNG) fill the top spaces.

4. **Actions**:
   - `submit:<WORD>`: submits the spelled word. Validated against the dictionary and grid paths. Consumes tiles, cascades board, awards score.
   - `shuffle`: consumes 1 turn to reshuffle all 16 board tiles when no desirable words are available.
   - `pass`: yields turn without forging a word.

5. **Scoring & End Conditions**:
   - Base word score: $\text{sum}(\text{letter points}) \times (\text{word length} - 2)$.
   - Target goal: reach 300 points within 20 turns.
   - Victory: `score >= targetScore`.
   - Defeat: `turnsLeft <= 0` while `score < targetScore`.
