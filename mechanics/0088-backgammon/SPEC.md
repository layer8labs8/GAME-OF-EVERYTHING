# 0088-backgammon: Classic Backgammon

A pure, deterministic implementation of standard Backgammon for 2 players. White (Player) competes against Black (AI) across a 24-point board with two dice per turn, doubles granting 4 moves, hitting vulnerable single-checker blots to the bar, and bearing off 15 checkers to victory.

## Core Rules & Features
- **Board & Checkers**:
  - 24 triangular points.
  - White (Player): 15 checkers moving in descending order (24 towards home board 1-6).
  - Black (AI): 15 checkers moving in ascending order (1 towards home board 19-24).
  - Standard setup:
    - White: 2 on pt 24, 5 on pt 13, 3 on pt 8, 5 on pt 6.
    - Black: 2 on pt 1, 5 on pt 12, 3 on pt 17, 5 on pt 19.
- **Dice & Movement**:
  - Two d6 dice rolled each turn. Rolling doubles awards four moves of that die value.
  - A point is blocked if the opponent has 2 or more checkers on it.
  - A point with 1 opponent checker is a blot; landing on it hits the blot to the bar.
  - Checkers on the bar must re-enter before any other checker can move.
- **Bearing Off**:
  - Once all 15 checkers have entered the home board (points 1-6 for White), checkers may be borne off using exact or higher die values.
  - The first player to bear off all 15 checkers wins the match.
- **Bot Contract**:
  - `createState(seed)`: Sets standard checker positions, rolls starting dice for White, and establishes seed RNG.
  - `legalActions(state)`: Returns array of valid moves (`move:{from}:{die}`, `enter:{die}`, `bear_off:{from}:{die}`, or `pass_dice`).
  - `step(state, action)`: Applies player move and die consumption. When player turn ends, simulates AI turn and rolls fresh dice for player. Returns `{ reward, done }`.
  - `isOver(state)`: Returns true if White bears off 15, Black bears off 15, or step limit reached.
  - `score(state)`: Net checkers borne off and pip advantage.
