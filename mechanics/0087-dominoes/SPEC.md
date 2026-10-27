# 0087-dominoes: Classic Dominoes

A pure, deterministic implementation of standard Double-Six Draw Dominoes. Two players (You and an AI opponent) are dealt 7 bone tiles from a 28-tile boneyard and match matching pip ends to shed their hands.

## Core Rules & Features
- **Set & Deal**:
  - Full Double-Six domino set: 28 unique tiles from `[0,0]` to `[6,6]`.
  - Both Player and AI receive 7 initial tiles. The remaining 14 tiles reside in the boneyard.
- **Board Chain & Matching Ends**:
  - The first tile placed initiates the chain, establishing both `leftEnd` and `rightEnd`.
  - Subsequent plays must connect a tile with an end whose pip count matches either side:
    - Connecting to `leftEnd`: Tile is oriented so matching pip faces inward, exposing the other pip as the new `leftEnd`.
    - Connecting to `rightEnd`: Tile connects outward, exposing the new `rightEnd`.
- **Drawing & Passing**:
  - If a player possesses no matching tiles:
    - They must draw from the boneyard (`draw`) until a playable tile is acquired or the boneyard is exhausted.
    - If the boneyard is empty with no legal plays, the player must `pass`.
- **Winning the Hand**:
  - **Domino!**: The first player to shed all tiles wins immediately. The winner scores the sum of all pips remaining in the opponent's hand.
  - **Blocked Game**: When neither player can play and the boneyard is empty, the player with the lowest pip total wins the pip difference.
- **Bot Contract**:
  - `createState(seed)`: Deals 7 tiles to each player and establishes boneyard.
  - `legalActions(state)`: Returns valid tile plays (`play:{idx}:left`, `play:{idx}:right`), `draw`, or `pass`.
  - `step(state, action)`: Applies player move and immediately simulates AI counter-move. Returns `{ reward, done }`.
  - `isOver(state)`: Returns true when hand concludes (Domino or Blocked) or step limit reached.
  - `score(state)`: Net pip score advantage.
