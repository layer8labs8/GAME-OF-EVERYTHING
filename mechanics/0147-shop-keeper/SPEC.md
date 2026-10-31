# 0147-shop-keeper: Arcane Emporium

A fantasy merchant shopkeeper simulation. Players operate an adventurer item shop in a bustling fantasy citadel, balancing wholesale procurement, shelf inventory, customer requests, bargaining margins, shop renovations, and guild taxes to build a flourishing commercial empire.

## Core Pillars & Mechanics

- **Merchandise & Wholesale Supply**:
  - `Potions`: Basic healing therapeutics. Wholesale: $25, Retail sale: $55.
  - `Scrolls`: Spell incantations. Wholesale: $50, Retail sale: $110.
  - `Weapons`: Forged steel and runic blades. Wholesale: $120, Retail sale: $250.
  - `Artifacts`: Rare enchanted relics. Wholesale: $280, Retail sale: $600.
- **Storefront & Reputation**:
  - `gold`: Current merchant treasury (starts at $400).
  - `reputation`: Patron satisfaction rating (0-100%). High reputation increases customer footfall and spending willingness.
  - `shelves`: Display capacity (starts at 4, expandable to 8).
  - `shopTier`: Visual and commercial rank (0: Quaint Stall, 1: High Street Shop, 2: Grand Emporium, 3: Royal Bazaar).
- **Customer Transactions & Commerce Loop**:
  - Customers in the shop express desires for specific inventory items.
  - `action:sell_item`: Fulfill current customer's order from stock, earning retail gold, +2% reputation, and score.
  - `action:bargain_sale`: Offer a friendly discount (-20% gold, +6% reputation boost).
  - `action:order_<type>`: Place wholesale procurement order with the guild caravan.
  - `action:expand_shelves`: Add 2 display pedestals to increase stock capacity ($250).
  - `action:renovate_shop`: Upgrade shop decor, unlocking the next commercial tier ($400).
  - `action:close_shop_for_day`: Concludes business day, reconciles guild lease & taxes ($60 to $120), rests, and welcomes a new patron cohort.
- **Victory & Defeat**:
  - Victory: Attain Royal Bazaar rank (Tier 3) with >= $4,000 Gold and >= 80% Reputation.
  - Defeat: Bankruptcy (gold falls below -$300) or Guild sanction (reputation reaches 0).
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `day`: integer (business day)
- `gold`: integer (starting $400)
- `reputation`: integer (starting 70%)
- `shopTier`: integer (0 to 3)
- `shelves`: integer (starting 4)
- `stock`: object { potions: 3, scrolls: 2, weapons: 1, artifacts: 0 }
- `customerQueue`: array of customer objects { id, name, wants: string, patience: integer }
- `customersServed`: integer
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized shopkeeper state.
- `legalActions(state)`: Returns non-empty list of available commercial, procurement, and administrative actions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean simulation completion flag.
- `score(state)`: Evaluates shopkeeping efficiency score.
