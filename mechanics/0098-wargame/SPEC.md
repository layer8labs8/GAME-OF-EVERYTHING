# 0098-wargame: Operational Wargame

An authentic hex-and-counter operational military wargame where the commander directs combined-arms divisions (Armored, Infantry, Artillery, Recon) across an operational theatre to capture strategic supply depots and the enemy General Headquarters (HQ).

## Core Rules & Features
- **Operational Hex Grid**:
  - 5x5 hex coordinate battlefield with varying terrain: Plains (neutral), Forests (+1 Defense), Fortified Hills (+2 Defense), Cities (Urban Bastions).
  - Blue HQ at hex `(0, 2)` (Player Base); Red HQ at hex `(4, 2)` (Enemy Base).
  - Strategic Supply Depots at `(2, 0)` and `(2, 4)` providing operational reinforcement points.
- **Divisional Counters (Combined Arms)**:
  - **Armor ("Panzer")**: Combat Strength 10, Movement Points (MP) 3, Armor Breakthrough (ignores 1 level of entrenchment).
  - **Infantry ("Rifle")**: Combat Strength 8, MP 2, Defense Expert (+1 defense bonus in fortified/urban terrain).
  - **Artillery ("Heavy Guns")**: Combat Strength 6, MP 1, Indirect Bombardment (Range 2, strips target entrenchment).
  - **Recon ("Cavalry / Mech")**: Combat Strength 5, MP 4, High Mobility, Flank Reconnaissance.
- **Wargaming Combat Dynamics**:
  - **Entrenchment (0–3)**: Units that hold position dig defensive trenches, adding +2 defense per level.
  - **Supply Tracing**: Every division must trace a line of clear hexes back to their friendly HQ or captured Depot. Unsupplied units suffer Disorganized status (-50% attack/defense power).
  - **Combat Results Table (CRT)**:
    - Odds calculated as `(Attacker Effective Power) / (Defender Effective Power)`.
    - Odds ratio determines casualties and tactical outcomes: Defender Retreat (DR), Attacker Repulse (AR), or Mutual Losses (EX).
- **Tactical Actions**:
  - `move:{unitId}:{hexR},{hexC}`: Advances division across hex terrain within MP allowance.
  - `attack:{unitId}:{targetHexR},{targetHexC}`: Assaults adjacent hostile division using combined-arms combat resolution.
  - `bombard:{artilleryId}:{targetHexR},{targetHexC}`: Fires artillery battery at enemy hex within 2 tiles, dealing suppression and reducing entrenchment.
  - `entrench:{unitId}`: Orders division to fortify position (+1 entrenchment).
  - `resupply:{unitId}`: Restores division strength when connected to an unblocked supply hub.
  - `end_turn`: Ends friendly operational phase, traces supply status, and triggers enemy counter-offensive.
- **Victory & Defeat**:
  - **Decisive Victory**: Capture enemy Primary HQ hex OR completely annihilate all enemy divisions.
  - **Defeat**: Friendly Primary HQ captured, all friendly divisions eliminated, or turns exceed MAX_TURNS (20).
- **Bot Contract**:
  - `createState(seed)`: Generates theater map, divisional counters, terrain bonuses, and operational supply networks.
  - `legalActions(state)`: Returns valid list of moves, attacks, bombardments, and operational commands.
  - `step(state, action)`: Executes military order, updates hex control, returns `{ reward, done }`.
  - `isOver(state)`: Checks victory or defeat conditions.
  - `score(state)`: Evaluates operational hex control, enemy casualties inflicted, and preserved division strength.
