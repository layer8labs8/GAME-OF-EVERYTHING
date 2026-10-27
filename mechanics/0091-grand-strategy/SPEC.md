# 0091-grand-strategy: Continental Hegemony

A grand strategy simulation governing the medieval realm of Valoria across a 12-province continent featuring statecraft diplomacy, taxation economy, manpower mobilization, national stability, and geopolitical warfare.

## Core Rules & Features
- **Geopolitical Landscape**:
  - 12 historical provinces divided among 4 sovereign powers:
    - **Kingdom of Valoria (Player)**: Capital Valoria City (0), High Plains (1), Riverlands (2).
    - **Republic of Solaris**: Sol Citadel (3), Sunport (4), Vineyards (5).
    - **Iron Duchy**: Iron Keep (6), Peakhold (7), Pine Valley (8).
    - **Shadowfang Khanate**: Steppe Camp (9), Nomad Gate (10), Dune Watch (11).
  - Province borders define military corridors and trade routes.
- **Statecraft Resources**:
  - **Treasury (Gold)**: Enacts domestic reforms and funds standing military levies.
  - **Manpower**: Replenishing demographic reserve required for army mobilization.
  - **Diplomatic Influence**: Expended to forge strategic alliances or draft official Casus Belli war declarations.
  - **Stability (0-100%)**: National cohesion and order; high stability boosts tax revenues and military combat morale, whereas low stability risks regional rebellion.
- **Grand Strategic Actions**:
  - **Mobilization (`recruit_levy:{provId}`)**: Raise +3 battalions in an owned province (Costs 20 Gold, 15 Manpower).
  - **Governance (`enact_reform`)**: Invest in royal infrastructure and justice, boosting stability by +15% (Costs 30 Gold).
  - **Diplomacy (`diplomacy_alliance:{nation}`)**: Form a mutual defensive and trade pact with a neighboring realm (Costs 25 Influence; grants trade income).
  - **Casus Belli (`declare_war:{nation}`)**: Issue war declaration against a sovereign neighbor (Costs 15 Influence).
  - **Campaign (`march_campaign:{from}:{to}`)**: March battalions into adjacent enemy or rebel provinces. Tactical combat resolves via troop ratios, provincial fortifications, and stability morale modifiers.
  - **State Treaty (`sue_peace:{nation}`)**: Dictate terms of surrender when War Score reaches >= 30, compelling enemy to cede occupied provinces and pay war indemnities.
- **Turn Sequence & World AI**:
  - Player executes strategic decrees and selects `end_turn`.
  - Yearly taxation is collected, manpower levies replenished, and diplomatic influence accrued.
  - Sovereign AI powers conduct foreign policy: forming opportunistic alliances, reinforcing border garrisons, and prosecuting military offensives.
- **Victory & Defeat**:
  - **Continental Dominion Victory**: Controlling at least 8 of the 12 continental provinces.
  - **Grand Hegemonic Alliance**: Establishing alliances or subjugating all 3 rival nations.
  - **Defeat**: Losing the Capital (Valoria City) or suffering complete annexation.
  - **25-Year Era Limit**: Concludes based on continental prestige and territorial holdings.
- **Bot Contract**:
  - `createState(seed)`: Initializes continental geography, national treasuries, and diplomatic treaties.
  - `legalActions(state)`: Returns valid geopolitical options (`recruit_levy:*`, `enact_reform`, `diplomacy_alliance:*`, `declare_war:*`, `march_campaign:*`, `sue_peace:*`, `end_turn`).
  - `step(state, action)`: Deterministic state transition, battle resolution, and diplomatic simulations. Returns `{ reward, done }`.
  - `isOver(state)`: Evaluates victory, annexation, or era completion.
  - `score(state)`: Measures territorial dominance, stability, treasury, and prestige bonuses.
