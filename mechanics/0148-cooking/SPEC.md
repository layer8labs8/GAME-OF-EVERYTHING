# 0148-cooking: Bistro Rush

A fast-paced culinary restaurant simulation inspired by Overcooked and Cook, Serve, Delicious!. Players take on the role of Executive Chef, managing kitchen stations (Chopping Board, Searing Skillet, Plating Counter), juggling incoming dinner tickets, maintaining hygiene, balancing cooking timers to avoid burnt food, and aiming for Michelin three-star distinction.

## Core Pillars & Mechanics

- **Kitchen Stations & Workflow**:
  - `Cutting Board`: Preps fresh raw market produce (`action:prep_produce`).
  - `Searing Skillet`: Cooks meat and sauces to optimal culinary temperature (`action:cook_stove`).
  - `Plating Counter`: Assembles prepped and cooked components into finished culinary dishes (`action:plate_dish`).
  - `Dish Pit`: Cleans kitchen pans and porcelain dishes to maintain sterile hygiene (`action:wash_dishes`).
- **Menu Recipes & Tickets**:
  - `Bruschetta Rustica`: Prepped tomatoes, garlic herbs, toasted bread.
  - `Pasta Primavera`: Fresh pasta, sautéed garden vegetables, parmesan.
  - `Seared Filet Mignon`: Prime beef, garlic herb butter, wine reduction.
- **Service Operations & Rush Loop**:
  - `action:prep_produce`: Chops vegetables at cutting board (+2 Prepped Produce).
  - `action:cook_stove`: Sizzles meats and sauces on the stove (+2 Cooked Portions).
  - `action:plate_dish`: Combines 1 Prepped Produce + 1 Cooked Portion into 1 Plated Meal.
  - `action:serve_order`: Serves plated meal to active ticket, collecting payment, tips, and culinary prestige.
  - `action:wash_dishes`: Restores clean plateware (+2 Clean Plates).
  - `action:restock_pantry`: Purchases bulk raw ingredients ($50).
  - `action:advance_rush`: Advances dinner rush time, rolls active order patience, and admits next patron table.
- **Victory & Defeat**:
  - Victory: Serve at least 25 orders with >= $1,500 Revenue and >= 85% Michelin Critique Rating.
  - Defeat: Food safety shutdown (reputation drops to 0) or bankruptcy (funds < -$200).
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `serviceHour`: integer (e.g. 17 to 23 for dinner service)
- `revenue`: integer (starting $300)
- `critique`: integer (starting 75%)
- `cleanPlates`: integer (starting 4)
- `pantry`: object { rawProduce: 8, rawMeat: 6 }
- `station`: object { preppedProduce: 2, cookedPortions: 2, platedDishes: 1 }
- `orders`: array of ticket objects { id, dishName, payout, patience }
- `dishesServed`: integer
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized kitchen state.
- `legalActions(state)`: Returns non-empty list of available culinary and service actions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean simulation completion flag.
- `score(state)`: Evaluates culinary service score.
