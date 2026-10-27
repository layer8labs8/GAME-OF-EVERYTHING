# 0077: Poker - Royal Hold'em

A high-stakes Heads-Up Texas Hold'em Poker simulation. Duelists face off in intense betting rounds across the Flop, Turn, and River, balancing pot odds, value bets, bluffs, and 7-card hand combinations to bust the opponent and claim the championship stack.

## Core Rules

1. **Chips & Blinds**:
   - Starting Stack: 500 chips each.
   - Small Blind: 10 chips. Big Blind: 20 chips.
   - Dealer button alternates after each resolved hand.

2. **Hand Phases (Streets)**:
   - **Deal**: Each duelist receives 2 private hole cards from a standard 52-card deck.
   - **Pre-Flop**: Initial betting round based on hole cards.
   - **Flop**: 3 shared community cards revealed, followed by betting.
   - **Turn**: 4th community card revealed, followed by betting.
   - **River**: 5th community card revealed, final betting round.
   - **Showdown**: Best 5-card combination from 7 available cards (2 hole + 5 community) wins the accumulated pot.

3. **Poker Hand Ranking**:
   - Royal Flush > Straight Flush > Four of a Kind > Full House > Flush > Straight > Three of a Kind > Two Pair > One Pair > High Card.
   - Equal strength hands split the pot equally.

4. **Actions**:
   - `check`: Pass action when no bet is pending.
   - `call`: Match the current wager.
   - `bet`: Wager opening bet (20 chips) or raise outstanding bet.
   - `fold`: Forfeit the current hand and surrender chips committed to the pot.
   - `all_in`: Shove all remaining chips into the pot.

5. **Victory, Defeat & Scoring**:
   - Victory: Busting the opponent (Opponent chips reach 0) or amassing 1000 chips.
   - Defeat: Player chips reduced to 0.
   - Move limit: 120 actions maximum.
   - `score = playerChips * 10 + (won ? 2000 : 0) + handsWon * 100 - totalActions`.
