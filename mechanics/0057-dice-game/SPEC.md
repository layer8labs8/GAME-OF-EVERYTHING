# 0057: Dice Game - Royal Dice

A tactical dice strategy and probability management game based on classic *Yacht* and *Yahtzee*. Players roll five six-sided ivory dice, strategically toggle locks, utilize up to two re-rolls per round, and assign combinations into thirteen discrete scoring categories across upper and lower scorecard sections.

## Core Rules

1. **Dice Mechanics**:
   - 5 standard six-sided dice ($d_1, d_2, d_3, d_4, d_5$) with values in $\{1, 2, 3, 4, 5, 6\}$.
   - In each of the 13 rounds, the initial roll of all 5 dice occurs automatically at round start.
   - The player has 2 re-rolls remaining per round (`rollsLeft: 2`).
   - Players can toggle hold status on any individual die (`held: [false, false, false, false, false]`).
   - Executing `roll` re-rolls all unheld dice and decrements `rollsLeft`.

2. **Scoring Categories (13 total)**:
   - **Upper Section**:
     - `ones`: Sum of all dice showing 1.
     - `twos`: Sum of all dice showing 2.
     - `threes`: Sum of all dice showing 3.
     - `fours`: Sum of all dice showing 4.
     - `fives`: Sum of all dice showing 5.
     - `sixes`: Sum of all dice showing 6.
     - *Upper Bonus*: If upper section score $\ge 63$, grant +35 bonus points.
   - **Lower Section**:
     - `three_of_a_kind`: At least 3 matching dice $\rightarrow$ sum of all 5 dice (else 0).
     - `four_of_a_kind`: At least 4 matching dice $\rightarrow$ sum of all 5 dice (else 0).
     - `full_house`: 3 of one value and 2 of another $\rightarrow$ 25 points (else 0).
     - `small_straight`: 4 sequential values $\rightarrow$ 30 points (else 0).
     - `large_straight`: 5 sequential values $\rightarrow$ 40 points (else 0).
     - `yacht`: 5 matching dice $\rightarrow$ 50 points (else 0).
     - `chance`: Sum of all 5 dice.

3. **Actions**:
   - `toggle_hold:0` .. `toggle_hold:4`: Toggles hold flag on die $0..4$.
   - `roll`: Re-rolls unheld dice (legal when `rollsLeft > 0` and at least 1 die is unheld).
   - `score:<category>`: Assigns current dice roll to specified unfilled category, resets holds, and initiates next round. Legal at any point after first roll.

4. **Game End & Victory**:
   - The game completes when all 13 categories are scored (`round > 13`).
   - Victory benchmark: Total score $\ge 180$ points.
   - `score = totalScore + (bonusAwarded ? 35 : 0)`.
