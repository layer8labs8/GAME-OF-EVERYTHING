# 0100-god-game: Divine Dominion

A classic omnipotent god simulation where the player acts as a celestial deity, shaping the world through divine miracles (rain, lightning, terraforming, holy inspiration) to expand a faithful mortal civilization and vanquish a rival shadow cult.

## Core Rules & Features
- **Celestial World Grid**:
  - 5x5 world map of tiles: Plains, Deserts, Forests, Mountains, Water, and Holy Sites.
  - Player's Holy Temple at `(1, 1)` (Faithful Tribe, generates Mana from mortal prayers).
  - Rival Shadow Shrine at `(3, 3)` (Heretic Cult, casts malevolent curses).
  - Neutral tribal settlements at `(1, 3)` and `(3, 1)` that can be converted through divine awe.
- **Divine Miracles**:
  - `miracle_rain:{r},{c}` (Cost: 15 Mana): Blesses parched or barren tiles into lush fertile soil, accelerating food growth and population expansion.
  - `miracle_lightning:{r},{c}` (Cost: 25 Mana): Summons a blazing thunderbolt from the heavens, smiting enemy cultists or shattering hostile totems.
  - `miracle_raise_land:{r},{c}` (Cost: 20 Mana): Elevates water/lowland tiles into protective plateaus, defending settlements against floods.
  - `miracle_inspire_temple:{settlementId}` (Cost: 35 Mana): Bestows divine wisdom, upgrading a village shrine into a Golden Obelisk (+100% mana production).
  - `miracle_crusade:{settlementId}` (Cost: 40 Mana): Rallies mortal warriors into a holy crusade to march against the heretic shadow shrine.
- **Mortal Civilization Economy**:
  - Population consumes food and multiplies on fertile tiles.
  - Each mortal generates +1 Faith/Mana per turn.
  - Shrines and Obelisks channel mortal prayers directly to the deity.
- **Victory & Defeat**:
  - **Apotheosis / Total Dominion**: Annihilate the rival Shadow Shrine OR accumulate 300 Divine Faith with a fully upgraded Pantheon.
  - **Forsaken / Defeat**: Player's Holy Temple is destroyed or player mortal population falls to 0.
- **Bot Contract**:
  - `createState(seed)`: Initializes world grid, mortal populations, mana reserves, and rival deity.
  - `legalActions(state)`: Produces array of currently castable miracles and operational turns.
  - `step(state, action)`: Casts miracle, advances mortal life cycles, simulates rival dark deity turn, returns `{ reward, done }`.
  - `isOver(state)`: Checks whether world objectives or failures have concluded.
  - `score(state)`: Evaluates total faithful population, miracles invoked, and lands sanctified.
