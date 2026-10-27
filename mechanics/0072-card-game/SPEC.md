# 0072: Card Game - Duel of Eights (Crazy Eights)

A fast-paced, tactical shedding card game played with a standard 52-card deck. Players match suits and ranks to shed their hands, deploy special cards to disrupt the opponent, and wield Wild Eights to dictate the tempo of play.

## Core Rules

1. **Deck & Dealing**:
   - Standard 52-card deck:
     - Suits: Spades (`S`), Hearts (`H`), Diamonds (`D`), Clubs (`C`).
     - Ranks: `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `J`, `Q`, `K`, `A`.
   - Both Player and Opponent receive 5 cards at round start.
   - The top card of the draw pile is turned face-up to begin the discard pile.
   - The active suit is initialized to the suit of the starting card.

2. **Matching & Wild Cards**:
   - A normal card can be played if its suit matches `activeSuit` OR its rank matches `topCard.rank`.
   - **Wild Eights (`8`)**: Can be played on any card. When played, the player declares the new `activeSuit`.

3. **Special Action Cards**:
   - **Two (`2`)**: Forces the opponent to draw 2 penalty cards.
   - **Queen (`Q`)**: Skips the opponent's turn, granting an immediate consecutive play.
   - **Ace (`A`)**: Skips the opponent's turn.

4. **Actions**:
   - `play:CARD_ID`: Plays a matching card (e.g. `play:7H`, `play:KS`).
   - `play:CARD_ID,SUIT`: Plays a Wild Eight and declares the new active suit (e.g. `play:8D,S`).
   - `draw`: Draws a card from the stock pile if no valid card can be played (or before passing).
   - `pass`: Concludes turn after drawing if no card can be played.

5. **Rounds, Scoring & Victory**:
   - A round concludes immediately when either contestant empties their hand.
   - The round winner scores points for all cards left in the loser's hand:
     - Eight (`8`): 50 points
     - Face cards (`K`, `Q`, `J`): 10 points each
     - Ace (`A`): 1 point
     - Number cards (`2`-`10`): Face value
   - Match: First to 100 points or highest score after 3 rounds achieves Victory.
   - Defeat: Opponent reaches 100 points first or opponent scores higher after 3 rounds.
   - Move limit: 120 turns max per match.
   - `score = playerScore * 10 + (playerWonRound * 150) + (wonMatch ? 500 : 0) - totalMoves`.
