# 0103-economy: Tycoon Economy

An in-depth macroeconomic industrial simulation where the player acts as an industrial conglomerate chief executive, constructing multi-tiered supply chains (mining, agriculture, metallurgy, consumer electronics) and navigating dynamic supply-demand market cycles.

## Core Rules & Features
- **Multi-Tier Industrial Supply Chain**:
  - **Raw Resources**:
    - `coal`: Extracted by Coal Mines ($150 cost, produces 10 Coal/quarter).
    - `iron`: Extracted by Iron Foundries ($200 cost, produces 8 Iron/quarter).
    - `grain`: Harvested by Grain Agrigrounds ($120 cost, produces 15 Grain/quarter).
  - **Intermediate Processing**:
    - `steel`: Forged at Steel Mills ($300 cost, converts 5 Coal + 5 Iron into 8 Steel).
    - `rations`: Processed at Food Canning Plants ($220 cost, converts 10 Grain into 12 Packaged Rations).
  - **Finished High-Tech Goods**:
    - `electronics`: Assembled at Tech Labs ($450 cost, converts 4 Steel + $50 into 6 High-Tech Units).
- **Dynamic Commodity Market**:
  - Global price ticker for each commodity based on global supply/demand balance.
  - Selling high volumes suppresses local prices; holding back stock causes price spikes.
  - Quarterly macroeconomic shifts: Booms (+30% consumer demand), Stable, and Recessions (-25% industrial demand).
- **Corporate Finance & Capital Management**:
  - Credit rating system (AAA, AA, A, B, Junk) determining loan borrowing rates.
  - Stock valuation and shareholder dividends boosting corporate market cap.
  - Fixed quarterly operational overhead, equipment maintenance, and taxes.
- **Strategic Actions**:
  - `build_facility:{type}`: Constructs an industrial plant.
  - `process_goods:{facilityType}`: Runs production cycle transforming raw materials into manufactured outputs.
  - `sell_commodity:{commodity}:{amount}`: Sells inventory onto the open market at the prevailing exchange rate.
  - `upgrade_facility:{type}`: Enhances throughput and automation by 50%.
  - `take_loan` / `repay_loan`: Leverages or repays debt.
  - `issue_dividend`: Pays out cash to boost corporate equity valuation.
  - `next_quarter`: Advances financial quarter, processes market price fluctuations, interest, and economic trends.
- **Victory & Defeat**:
  - **Industrial Hegemon**: Reach $10,000 corporate net worth, operate at least 1 facility in each of the 4 tiers, and attain AAA credit rating within 20 quarters.
  - **Insolvency / Bankruptcy**: Cash balance falls below -$2,000.
- **Bot Contract**:
  - `createState(seed)`: Initializes starting capital ($800), initial market prices, and clean ledger.
  - `legalActions(state)`: Returns valid list of investments, sales, production orders, and fiscal operations.
  - `step(state, action)`: Executes financial command, updates balance sheet, returns `{ reward, done }`.
  - `isOver(state)`: Evaluates corporate solvency or empire victory milestones.
  - `score(state)`: Computes total net worth, facilities constructed, and trade volume achieved.
