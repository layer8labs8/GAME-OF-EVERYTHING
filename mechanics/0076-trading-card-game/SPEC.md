# 0076: Trading Card Game - Mythic TCG (Aether Duels)

A premier head-to-head trading card game in the tradition of *Hearthstone* and *Magic: The Gathering*. Duelists wield escalating mana crystals, summon mythical creatures with keywords (Taunt, Charge, Battlecry), cast decisive spells, and command battlefield minion trades to reduce the enemy champion to 0 Life.

## Core Rules

1. **Champions & Mana Curve**:
   - Player and Opponent start with 30 Life (HP).
   - Turn 1 begins with 1 Mana Crystal. Max mana increases by +1 each turn up to 10.
   - Mana fully replenishes at the start of each turn.
   - Both duelists begin with 3 cards in hand and draw 1 card each turn from their 24-card library.

2. **Battlefield & Minion Combat**:
   - Board capacity: 5 minion slots per side.
   - Minions have Attack, Health, Cost, and special keywords:
     - `Taunt`: Protects other targets; must be attacked first.
     - `Charge`: Can attack immediately on the turn summoned.
     - `Battlecry`: Triggers an immediate effect when cast from hand.
   - Minion combat is mutual: both combatants deal their attack power simultaneously.

3. **Card Library**:
   - **Minions**:
     - *Shieldbearer* (Cost 1, 0/4, Taunt)
     - *Bloodfen Raptor* (Cost 2, 3/2)
     - *Frostfang Shaman* (Cost 3, 2/3, Battlecry: Deal 2 damage to enemy champion)
     - *Sen'jin Guardian* (Cost 4, 3/5, Taunt)
     - *Stormpike Lancer* (Cost 5, 4/4, Charge)
     - *Boulderfist Behemoth* (Cost 6, 6/7)
   - **Spells**:
     - *Arcane Shot* (Cost 1: Deal 2 damage to target)
     - *Frostbolt* (Cost 2: Deal 3 damage to target)
     - *Fireball* (Cost 4: Deal 6 damage to target)
     - *Holy Light* (Cost 2: Restore 6 health to your champion)
     - *Flamestrike* (Cost 7: Deal 4 damage to all enemy minions)

4. **Actions**:
   - `play:CARD_ID`: Summons a minion or plays a non-targeted spell.
   - `play:CARD_ID,TARGET_ID`: Casts a targeted spell or triggers a battlecry against target (`opp_hero` or `minion_id`).
   - `attack:MINION_ID,TARGET_ID`: Commands a ready minion to strike an enemy minion or `opp_hero`.
   - `endTurn`: Concludes turn, passes to Opponent AI.

5. **Victory, Defeat & Scoring**:
   - Victory: Opponent Life reduced to 0.
   - Defeat: Player Life reduced to 0.
   - Move limit: 50 turns maximum.
   - `score = (30 - oppHp) * 50 + playerHp * 20 + (won ? 1000 : 0) - totalTurns * 10`.
