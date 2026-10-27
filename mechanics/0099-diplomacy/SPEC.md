# 0099-diplomacy: Diplomacy

A grand diplomatic and military strategy simulation based on simultaneous movement, support orders, alliances, and tactical betrayals across a contested European theatre.

## Core Rules & Features
- **European Geopolitical Theater**:
  - 7 Provinces:
    - `london` (Coastal Supply Center - Britain)
    - `paris` (Inland Supply Center - France)
    - `berlin` (Inland Supply Center - Prussia)
    - `belgium` (Contested Coastal Supply Center)
    - `channel` (Sea Province connecting London, Belgium, Brest/Paris)
    - `burgundy` (Buffer Province connecting Paris, Belgium, Berlin)
    - `ruhr` (Buffer Province connecting Berlin, Belgium, Burgundy)
  - 3 Sovereign Powers:
    - **France (Player / Blue)**: Starts with Army in Paris and Fleet in Brest.
    - **Britain (AI / Red)**: Starts with Fleet in London and Fleet in North Sea/Channel.
    - **Prussia (AI / Green)**: Starts with Army in Berlin and Army in Ruhr.
- **Simultaneous Order Engine**:
  - Each season (Spring and Fall), powers issue secret written orders to their units:
    - **Hold**: Defends current province with base defense strength 1.
    - **Move**: Attempts to enter an adjacent province with attack strength 1.
    - **Support Hold**: Directs unit to add +1 defense strength to a friendly or allied unit in an adjacent province.
    - **Support Move**: Directs unit to add +1 attack strength to a friendly or allied unit attacking an adjacent province.
  - **Support Cutting**: If a unit offering support is attacked by any hostile force from an unrelated province, its support order is immediately severed ("cut").
  - **Bouncing**: Two or more units attempting to enter the same province with equal net strength bounce back to their original provinces.
- **Diplomatic Pacts & Treaties**:
  - Non-Aggression Pacts (NAP) with Britain or Prussia prevent unprovoked border incursions unless backstabbed.
  - Cooperative Support Treaties incentivize AI powers to lend military support into contested zones like Belgium.
- **Victory & Defeat**:
  - **Continental Dominance**: Control 4 or more Supply Centers (SCs) to win.
  - **Defeat**: Capital province (Paris) captured, all units eliminated, or failing to secure dominance within 16 seasons.
- **Bot Contract**:
  - `createState(seed)`: Initializes provinces, initial unit positions, SC ownership, and diplomatic relations.
  - `legalActions(state)`: Returns valid list of unit orders (`order_move`, `order_hold`, `order_support_move`, `order_support_hold`), pact proposals, and `resolve_season`.
  - `step(state, action)`: Assigns unit orders or triggers simultaneous seasonal resolution. Returns `{ reward, done }`.
  - `isOver(state)`: Returns boolean terminal state.
  - `score(state)`: Evaluates Supply Centers controlled, armies maintained, and diplomatic leverage.
