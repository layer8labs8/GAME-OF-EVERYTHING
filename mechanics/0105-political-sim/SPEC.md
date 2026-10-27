# 0105-political-sim: Statecraft

A political leadership and legislative policy simulator where the player acts as the Head of State, balancing factional interests (Workers, Capitalists, Patriots, Reformists), managing national debt and stability, and surviving general election cycles.

## Core Rules & Features
- **Key National Indicators**:
  - **Public Approval (0–100%)**: Weighted citizen satisfaction across all 4 societal factions. If approval sinks below 25%, a vote of no confidence or impeachment triggers defeat.
  - **National Stability (0–100%)**: Societal order and constitutional rule. Drops during riots or civil strife; if it hits 0, a coup deposes the administration.
  - **State Treasury ($M)**: Net fiscal balance. Annual tax revenue minus active policy expenditure and debt interest.
  - **GDP Economic Index**: Determines baseline annual tax receipts.
- **Societal Factions**:
  - **Labor (Workers)**: Demands public healthcare, worker protections, and fair wages.
  - **Capitalists (Industry)**: Demands corporate deregulation, trade expansion, and low taxes.
  - **Patriots (Military / Security)**: Demands defense modernization, border protection, and anti-insurgency readiness.
  - **Reformists (Civil / Green)**: Demands education funding, anti-corruption transparency, and constitutional rights.
- **Cabinet Decrees & Policies**:
  - `enact_policy:{policyId}` / `repeal_policy:{policyId}`:
    - `healthcare`: +Labor, +Reformists, -$120M annual budget.
    - `tax_cut`: +Capitalists, +GDP growth, -$140M budget.
    - `defense`: +Patriots, +Stability, -$150M budget.
    - `education`: +Reformists, +Labor, +GDP growth, -$100M budget.
    - `anti_corruption`: +Stability, +Reformists, -Capitalists, -$80M budget.
    - `austerity`: +$180M budget, -Labor, -Reformists, -Stability.
- **National Crises & Events**:
  - General strikes, inflationary shocks, border friction, and political scandals occur periodically, requiring cabinet resolutions (`resolve_crisis:{choice}`).
- **Election Cycles & Terms**:
  - Democratic general elections occur every 4 quarters (1 fiscal year = 1 term).
  - Bounded simulation: `MAX_QUARTERS = 16` (4 fiscal terms).
- **Victory & Defeat**:
  - **Golden Republic / Statesman Triumph**: Complete all 16 quarters, achieve re-election in every cycle, and maintain Stability >= 75% and Public Approval >= 60%.
  - **Defeat**: Impeached (Approval < 25%), Coup (Stability <= 0), or National Insolvency (Debt > $2,000M).
- **Bot Contract**:
  - `createState(seed)`: Initializes starting republic state (55% Approval, 60% Stability, $400M Treasury, clean debt).
  - `legalActions(state)`: Returns valid list of legislative decrees, crisis responses, and quarter progression.
  - `step(state, action)`: Applies political order, computes faction satisfaction, evaluates election hurdles, returns `{ reward, done }`.
  - `isOver(state)`: Returns boolean terminal state.
  - `score(state)`: Evaluates enduring stability, citizen approval, GDP growth, and treasury surplus.
