# 0090-4x: Galactic 4X (Stellar Dominion)

A deterministic space-opera 4X strategy game embodying the four pillars: eXplore uncharted star systems, eXpand interstellar colonies, eXploit planetary minerals and scientific research, and eXterminate rival alien armadas.

## Core Rules & Features
- **Galactic Map & Hyperlanes**:
  - 8 star systems connected by hyperlane trade and military routes:
    - 0: Sol (Human Homeworld)
    - 1: Alpha Centauri (Rich mineral deposits)
    - 2: Sirius (High-energy binary star)
    - 3: Vega (Research nebula)
    - 4: Cygnus Core (Ancient celestial gateway)
    - 5: Arcturus (Frontier world)
    - 6: Polaris (Strategic outpost)
    - 7: Omicron Prime (Alien Empire Homeworld)
  - Fog-of-war conceals unexplored star systems until scouted.
- **The Four Pillars (Actions)**:
  - **eXplore (`explore:{id}`)**: Send scout probes to adjacent unexplored stars to reveal planetary resources and clear fog-of-war (Costs 5 Energy).
  - **eXpand (`colonize:{id}`)**: Establish planetary colony outposts on explored, unowned worlds (Costs 15 Minerals, 10 Energy).
  - **eXploit (`research`)**: Spend 20 Science to unlock advanced galactic technologies (Shields, Warp drives, Plasma weaponry), boosting fleet power and resource yields.
  - **eXterminate (`build_fleet:{id}` & `move_fleet:{from}:{to}`)**: Construct dreadnought fleets (Costs 10 Minerals, 5 Energy) and maneuver battle groups across hyperlanes. Entering enemy star systems resolves deterministic tactical space battles.
- **Economic Loop & Upkeep**:
  - Each colonized system yields turn-by-turn resources based on planetary specialization (Minerals for construction, Energy for propulsion/maintenance, Science for tech).
  - High tech level grants resource multiplication and combat die advantages.
- **Turn Progression & Rival AI**:
  - Selecting `end_turn` collects planetary revenues and activates the Alien Rival AI, which scouts hyperlanes, establishes competing colonies, reinforces battle fleets, and launches counter-offensives.
- **Victory & Defeat**:
  - **Conquest Victory**: Sacking the Alien Homeworld (Omicron Prime).
  - **Hegemonic Victory**: Colonizing at least 5 of the 8 galactic systems.
  - **Technological Victory**: Achieving Tech Level 5.
  - **Defeat**: Losing the Sol Homeworld or exhausting all colonies.
- **Bot Contract**:
  - `createState(seed)`: Generates galaxy seed, star resources, initial fleet garrisons, and treasuries.
  - `legalActions(state)`: Produces array of valid 4X decisions (`explore:*`, `colonize:*`, `build_fleet:*`, `move_fleet:*`, `research`, `end_turn`).
  - `step(state, action)`: Pure deterministic state transition, combat resolution, and AI simulation. Returns `{ reward, done }`.
  - `isOver(state)`: Checks victory, defeat, or max turn threshold (30 turns).
  - `score(state)`: Evaluates colonies, tech advancements, armada size, and victory bonuses.
