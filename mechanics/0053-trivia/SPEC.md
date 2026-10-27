# 0053: Trivia - Chronicle Quiz

A knowledge-testing quiz show puzzle game. The player navigates 10 multiple-choice trivia challenges spanning science, computing history, astronomy, and gaming lore. Players deploy strategic lifelines (50:50, Double Down, and Skip) while chaining consecutive correct answer multipliers to become the grand trivia champion before incurring 3 strikes.

## Core Rules

1. **Quiz Structure**:
   - 10 sequential rounds of trivia drawn deterministically from an encyclopedic knowledge bank.
   - Each round presents 1 question with 4 multiple-choice options (indices $0, 1, 2, 3$).
   - Three strikes maximum (`strikes < 3`). Incurring 3 incorrect answers triggers instant disqualification.

2. **Lifelines**:
   - `fifty_fifty`: eliminates 2 incorrect answer options, leaving 1 correct and 1 wrong choice. (1 use).
   - `double_down`: doubles the point award for the active question if answered correctly. (1 use).
   - `skip`: bypasses the current question without scoring or strike penalty. (1 use).

3. **Streak & Scoring**:
   - Correct answer base award: +100 points.
   - Multipliers:
     - Streak 1: $1\times$ (100 pts)
     - Streak 2: $1.5\times$ (150 pts)
     - Streak 3: $2\times$ (200 pts)
     - Streak 4+: $3\times$ (300 pts)
   - Double Down doubles the final calculated score for that question.
   - Incorrect answer: incurs 1 strike, resets streak to 0, penalty -25 points.

4. **Actions**:
   - `answer:<index>`: commits option $0, 1, 2, 3$ as the player's final answer.
   - `use_lifeline:fifty_fifty`: eliminates 2 incorrect options.
   - `use_lifeline:double_down`: activates $2\times$ score multiplier for current question.
   - `use_lifeline:skip`: skips current question and advances to next.

5. **End Conditions**:
   - Victory: answer all 10 rounds with fewer than 3 strikes (`currentRound === 10 && strikes < 3`).
   - Defeat: incur 3 strikes (`strikes >= 3`).
