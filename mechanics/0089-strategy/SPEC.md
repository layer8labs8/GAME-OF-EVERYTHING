# 0089-strategy: Territory Strategy

A grand wargame and territory conquest strategy game played across a connected realm of 9 strategic provinces with recruitment economy, tactical troop maneuvers, garrison defense, and deterministic siege combat.

## Core Rules & Features
- **Realm Map**:
  - 9 interconnected territories across three regions:
    - 0: Nordmark (North-West)
    - 1: Frostpeak (North)
    - 2: Sunhaven (North-East)
    - 3: Ironhold (West)
    - 4: Crownland (Central Imperial Citadel, high income)
    - 5: Goldcoast (East)
    - 6: Shadowfen (South-West)
    - 7: Verdantia (South)
    - 8: Emberfall (South-East)
  - Inter-province road networks define legal troop movement and assault trajectories.
- **Factions**:
  - **Player ("Blue Banner")**: Starts with garrisons at Ironhold and Shadowfen.
  - **Enemy ("Red Empire")**: Starts with garrisons at Sunhaven and Goldcoast.
  - **Neutral Barons**: Independent garrisons defending unoccupied realm territories.
- **Economic & Military Loop**:
  - Each owned province produces gold income each turn (standard: 1 gold, Crownland Citadel: 3 gold).
  - New battalions cost 2 gold each to recruit into any friendly province.
  - When marching (`attack:from:to`), at least 1 army must remain behind to maintain territorial control; moving forces advance into adjacent provinces.
  - Moving into a friendly province reinforces its garrison.
  - Moving into a hostile territory initiates siege combat resolved via deterministic martial battle rounds.
- **Turn Sequence**:
  - Player recruits battalions and initiates maneuvers or attacks across connected borders.
  - Player ends turn: province income is collected, then Enemy AI calculates optimal recruitment and launches assaults on adjacent player or neutral strongholds.
- **Victory & Defeat**:
  - Complete conquest of all enemy territories or controlling all 9 provinces grants Total Victory.
  - Losing all player territories or facing enemy dominion results in Defeat.
  - 30-turn limit resolves by province count and military standing.
- **Bot Contract**:
  - `createState(seed)`: Returns initialized deterministic realm map, initial garrisons, and treasuries.
  - `legalActions(state)`: Returns array of valid maneuvers (`recruit:{id}`, `attack:{from}:{to}`, `end_turn`).
  - `step(state, action)`: Applies recruitment, marches, or AI turn execution. Returns `{ reward, done }`.
  - `isOver(state)`: Returns whether victory, defeat, or max turn threshold has occurred.
  - `score(state)`: Measures territorial dominance, army count, treasury, and victory bonuses.
