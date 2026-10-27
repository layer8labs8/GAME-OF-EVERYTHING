# 0078: Board Game - Royal Ludo

A vibrant, fast-paced heads-up adaptation of the ancient cross-and-circle board game *Ludo* (Pachisi). Duelists navigate tokens around a 40-space perimeter track, rolling dice, capturing rival pawns, and seeking safe havens to race all pieces into the home triangle.

## Core Rules

1. **Board & Tracks**:
   - 40-space perimeter loop (coordinates 0 to 39).
   - Player (Emerald Green):
     - Yard -> Entry Space 0 -> 40 perimeter steps -> Home Corridor (steps 40 to 44) -> Home Goal (step 45).
   - Opponent (Crimson Red):
     - Yard -> Entry Space 20 -> 40 perimeter steps -> Home Corridor (steps 40 to 44) -> Home Goal (step 45).
   - Safe havens (Star spaces: 0, 8, 20, 28) protect tokens from capture.

2. **Dice & Rolling**:
   - Standard 6-sided die ($1$ to $6$).
   - A roll of $6$ allows deploying a token from the yard to the entry space.
   - Rolling a $6$ grants an immediate bonus roll.

3. **Capture & Home**:
   - Landing on an opponent's token on an open track space captures it, sending it back to their yard.
   - Entering the Home Goal (step 45) requires an exact roll count.

4. **Actions**:
   - `roll`: Rolls the die when turn begins.
   - `move:TOKEN_ID`: Advances the chosen token by the rolled value (or deploys from yard on a 6).

5. **Victory, Defeat & Scoring**:
   - Victory: Player successfully escorts all 3 tokens into the Home Goal.
   - Defeat: Opponent escorts all 3 tokens into the Home Goal first.
   - Move limit: 120 turns maximum.
   - `score = tokensHome * 500 + totalStepsTaken * 10 + captures * 100 + (won ? 1500 : 0) - totalTurns`.
