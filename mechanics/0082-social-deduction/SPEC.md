# 0082-social-deduction: Shadow Council

A Victorian occult social deduction game where 5 council members gather in a storm-locked manor. 3 Loyalists must unmask and exile 2 Saboteurs before the occultists complete their ritual or eliminate the council majority.

## Core Rules & Features
- **Council Roster**:
  - 5 members: Player (Lead Inquisitor), Dr. Sterling, Lady Constance, Officer Hayes, Scholar Vane.
  - Secret roles assigned deterministically: 3 Loyalists (seeking truth) and 2 Saboteurs (conspiring from within).
- **Phases of Play**:
  - **Night Investigation (`night`)**:
    - The Inquisitor inspects a fellow council member (`inspect:agentId`) to reveal their true secret alignment.
    - Saboteurs secretly plot an assassination against one member; if unprotected, that member is slain.
  - **Day Hearing & Testimonies (`day`)**:
    - The night report reveals who perished and presents testimonies from surviving members.
    - Loyalists report truthful whereabouts; Saboteurs offer alibis or cast subtle doubt.
  - **Council Vote (`voting`)**:
    - Council members cast ballots (`vote:agentId` or `skip_vote`).
    - The accused member with a plurality of votes is exiled from the manor.
- **Victory & Defeat**:
  - **Loyalist Victory**: Both Saboteurs are successfully voted out and exiled (+30 reward).
  - **Saboteur Victory**: Saboteurs reach parity with Loyalists, seizing control (-20 reward).
- **Bot Contract**:
  - `createState(seed)`: Initializes deterministic role assignment, alive roster, clues, and starting phase.
  - `legalActions(state)`: Returns valid night actions (`inspect:*`, `protect:*`, `pass`) or voting actions (`vote:*`, `skip_vote`).
  - `step(state, action)`: Resolves inspection, advances night assassinations and alibis, tallies council votes, and checks win/loss conditions.
  - `isOver(state)`: Returns true if all Saboteurs exiled, Loyalists overwhelmed, or maximum rounds reached.
  - `score(state)`: Net score reflecting correct accusations, surviving loyalists, and victory state.
