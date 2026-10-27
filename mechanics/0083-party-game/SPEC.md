# 0083-party-game: Party Frenzy

A fast-paced 5-round mini-game tournament where the player competes against 3 CPU contenders (Pip, Buzz, and Rex) across a gauntlet of quick reflex, trivia, pattern memory, target popping, and dice betting party challenges to capture the Star Trophy.

## Core Rules & Features
- **4-Contender Tournament**: Player (You) vs Pip, Buzz, and Rex.
- **5 Progressive Mini-Games**:
  1. **Quick Brain**: Fast mental math and trivia quiz with 4 choice buttons.
  2. **Balloon Blitz**: Pop high-value golden balloons before rivals snatch them.
  3. **Pattern Simon**: Memorize and reproduce a 4-color sequence (Red, Blue, Green, Yellow).
  4. **Target Rush**: Reflex precision targeting on moving prize targets.
  5. **Grand Finale Dice**: Risk-reward wager: Safe d6, High-Roller d12, or Star Steal gamble.
- **Round Scoring & Placement**:
  - Mini-game performance ranks players 1st through 4th.
  - 1st Place: +100 Coins & +1 Star ⭐
  - 2nd Place: +60 Coins
  - 3rd Place: +30 Coins
  - 4th Place: +10 Coins
- **Tournament Winner**:
  - The contender holding the most Stars (with Coins as tiebreaker) at the end of Round 5 takes 1st place.
- **Bot Contract**:
  - `createState(seed)`: Initializes leaderboard, player stats, round 1 mini-game, and seed RNG.
  - `legalActions(state)`: Returns valid actions for the active mini-game challenge.
  - `step(state, action)`: Resolves player action, deterministically simulates rivals, computes rankings, awards Stars/Coins, and loads the next round. Returns `{ reward, done }`.
  - `isOver(state)`: Returns true when all 5 rounds are completed.
  - `score(state)`: Player Stars * 100 + Coins.
