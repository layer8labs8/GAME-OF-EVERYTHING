# 0074: Deckbuilding - Realm Builder

A strategic medieval engine-building card game in the spirit of classic deckbuilders (Dominion). Players start with modest copper coins and estates, cycling and upgrading their personal deck through strategic market acquisitions to construct an opulent kingdom before the turn deadline.

## Core Rules

1. **Starter Deck & Economy**:
   - Starting deck: 7 Copper (+1 Coin each) and 3 Estates (+1 VP each).
   - Hand size: 5 cards drawn each turn.
   - Resource counters each turn:
     - Actions: Starts at 1.
     - Buys: Starts at 1.
     - Coins: Starts at 0 (gained by playing Copper/Silver/Gold and action bonuses).

2. **Supply Market**:
   - **Treasures**: Copper (Cost 0, +1 Coin), Silver (Cost 3, +2 Coins), Gold (Cost 6, +3 Coins).
   - **Victory Cards**: Estate (Cost 2, 1 VP), Duchy (Cost 5, 3 VP), Province (Cost 8, 6 VP).
   - **Kingdom Actions**:
     - *Village* (Cost 3): +1 Card, +2 Actions.
     - *Smithy* (Cost 4): +3 Cards.
     - *Market* (Cost 5): +1 Card, +1 Action, +1 Buy, +1 Coin.
     - *Workshop* (Cost 3): Gain a card costing up to 4 Coins.
     - *Festival* (Cost 5): +2 Actions, +1 Buy, +2 Coins.

3. **Turn Phases**:
   - **Action Phase**: Play Action cards from hand to trigger engine synergies.
   - **Buy Phase**: Play Treasure cards to amass currency and purchase cards from the Supply.
   - **Cleanup Phase**: Discard all played cards and remaining hand, then draw 5 new cards. Discard pile is reshuffled when draw deck is exhausted.

4. **Actions**:
   - `play:CARD_ID`: Plays an action or treasure card from hand.
   - `buy:CARD_NAME`: Purchases a card from the supply market into discard.
   - `endTurn`: Discards current hand and played cards, draws 5 new cards, advances turn counter.

5. **Victory, Defeat & Scoring**:
   - Target: Reach at least 32 Victory Points (or acquire 4 Provinces) within 25 turns.
   - Victory: Successfully reaching 32 VP or acquiring 4 Provinces before turn 25.
   - Defeat: Exceeding 25 turns (`turn > maxTurns`).
   - `score = totalVP * 50 + (won ? 500 : 0) + remainingCoins - (totalTurns * 15)`.
