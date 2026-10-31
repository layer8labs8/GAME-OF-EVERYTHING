# 0075: Roguelike Deckbuilder - Spire Crawl

An intense, turn-based roguelike dungeon deckbuilder. Players ascend a treacherous multi-floor spire, drafting potent attack and skill cards, monitoring telegraphed enemy intents, managing energy, block, and status effects to defeat elite monsters and topple the Spire Boss.

## Core Rules

1. **Hero & Vitals**:
   - Starting Health: 75 / 75 HP.
   - Energy: 3 per turn.
   - Block: Shields against incoming monster damage, reset at the start of each player turn.
   - Status effects:
     - `strength`: Adds flat bonus damage to attacks.
     - `dexterity`: Adds flat bonus block to defense skills.
     - `vulnerable`: Target takes 50% more damage from attacks.
     - `weak`: Dealer deals 25% less damage from attacks.

2. **Deck & Hand Management**:
   - Starter Deck (10 cards):
     - 4x `Strike` (Cost 1: Deal 6 damage).
     - 4x `Defend` (Cost 1: Gain 5 block).
     - 1x `Bash` (Cost 2: Deal 8 damage, apply 2 Vulnerable).
     - 1x `Survivor` (Cost 1: Gain 8 block).
   - Draw 5 cards at turn start. Unplayed cards are discarded at turn end.
   - When the draw pile empties, the discard pile is reshuffled.

3. **Spire Dungeon Path**:
   - **Floor 1**: Monster Encounter ("Cultist", 48 HP). Ritualist that gains +2 Strength every turn.
   - **Floor 2**: Campfire Rest Site (`rest`: heal 25 HP, or `smith`: upgrade card damage/block +3).
   - **Floor 3**: Elite Encounter ("Lava Golem", 72 HP). High armor, fiery telegraphed slams.
   - **Floor 4**: Spire Boss ("The Void Sovereign", 115 HP). Multi-hit attacks, summoning dark minions.
   - Defeating encounters yields card drafting rewards (choose 1 of 3 cards or skip).

4. **Enemy Intent**:
   - Enemy telegraphes upcoming action at turn start:
     - `attack`: Forthcoming strike with anticipated damage.
     - `defend`: Will bolster armor.
     - `buff`: Will boost strength or inflict debuffs.

5. **Actions**:
   - `play:CARD_ID`: Plays card from hand if sufficient energy is available.
   - `endTurn`: Concludes player turn, resolves telegraphed enemy attack against current block, advances enemy intent, and draws fresh hand.
   - `chooseReward:CARD_NAME`: Adds drafted card to deck after combat victory.
   - `skipReward`: Skips card drafting.
   - `rest`: Restores 25 HP at campfire.
   - `smith:CARD_ID`: Upgrades selected card at campfire (+3 damage/block).

6. **Victory, Defeat & Scoring**:
   - Victory: Slaying the Floor 4 Spire Boss.
   - Defeat: Player HP reduced to 0.
   - Move limit: 70 turns maximum.
   - `score = floorsCleared * 500 + totalDamageDealt * 5 + playerHp * 10 + (won ? 1000 : 0) - totalTurns * 5`.
