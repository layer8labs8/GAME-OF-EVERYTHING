# 0084-casino: Grand Casino Roulette

A pure, deterministic simulation of classic European Roulette (single zero 0-36). Players manage a 500-chip bankroll across 25 spins, placing inside straight bets, even-money outside bets, and dozen proposition wagers to reach High-Roller VIP status (1,500 chips).

## Core Rules & Features
- **Wheel & Table**:
  - European 37-pocket wheel (0 to 36). Single green 0 pocket.
  - 18 Red pockets: 1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36.
  - 18 Black pockets: 2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35.
- **Bet Types & Payouts**:
  - `bet:red:{amt}` / `bet:black:{amt}`: 1 to 1 payout.
  - `bet:even:{amt}` / `bet:odd:{amt}`: 1 to 1 payout (0 loses).
  - `bet:low:{amt}` (1-18) / `bet:high:{amt}` (19-36): 1 to 1 payout.
  - `bet:dozen1:{amt}` (1-12) / `bet:dozen2:{amt}` (13-24) / `bet:dozen3:{amt}` (25-36): 2 to 1 payout.
  - `bet:num_{0..36}:{amt}`: Straight-up single number wager with 35 to 1 payout.
- **Actions**:
  - Placing bets: `bet:{type}:{amt}` (deducts chips into current active bet slip).
  - `clear_bets`: Returns chips on table back to bankroll.
  - `spin`: Releases the ball into the wheel, resolves all payouts, logs win/loss result.
- **Victory & Termination**:
  - High-Roller Victory: Accumulate 1,500 chips (+50 reward).
  - Bust Defeat: Bankroll drops to 0 chips (-30 reward).
  - Time-Out: Concludes after 25 spins.
- **Bot Contract**:
  - `createState(seed)`: Initializes 500 chip bankroll, wheel, history, and seed RNG.
  - `legalActions(state)`: Returns valid betting actions and `spin` (when at least one bet is placed).
  - `step(state, action)`: Applies wager or spins wheel deterministically and computes exact payouts. Returns `{ reward, done }`.
  - `isOver(state)`: Returns true if bust, VIP goal achieved, or 25 spins complete.
  - `score(state)`: Player bankroll.
