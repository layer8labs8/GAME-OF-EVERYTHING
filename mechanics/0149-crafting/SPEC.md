# 0149-crafting: Rune & Anvil

A fantasy crafting and smithing simulation inspired by Minecraft, Atelier, and Blacksmith Simulator. Players operate the Royal Forge, smelting raw ores, hewing timber, prospecting mana crystals, and executing multi-tier recipes to synthesize legendary masterwork armaments and regalia.

## Core Pillars & Mechanics

- **Raw Materials & Smelting**:
  - `Timber`: Hewn oak logs for shields and axe hafts.
  - `Iron Ore`: Raw hematite mined from mountain quarries.
  - `Iron Ingot`: Smelted in the blast furnace (2 Iron Ore -> 1 Iron Ingot).
  - `Gemstone`: Arcane crystals channel magical enchantments.
  - `Runic Dust`: Alchemical catalyst used for high-tier rune imbuement.
- **Crafting Blueprint Tiers**:
  - `Tier 1: Sturdy Shield` (3 Timber + 2 Iron Ingot -> Value $90).
  - `Tier 2: Battleaxe of Might` (2 Timber + 4 Iron Ingot -> Value $160).
  - `Tier 3: Runic Blade` (1 Battleaxe + 2 Gemstone + 2 Runic Dust -> Value $380).
  - `Tier 4: Crown of the High Sovereign` (1 Runic Blade + 1 Sturdy Shield + 3 Gemstone + 4 Runic Dust -> Value $950).
- **Forge Operations & Actions**:
  - `action:gather_materials`: Forages lumber and surface iron ore.
  - `action:smelt_ingot`: Smelts raw iron ore into purified ingots.
  - `action:quarry_gemstones`: Excavates mana gems and crushing dust.
  - `action:craft_shield`: Crafts tier 1 defensive shield.
  - `action:craft_axe`: Forges tier 2 martial battleaxe.
  - `action:craft_runic_blade`: Enchants tier 3 runic blade.
  - `action:craft_crown`: Synthesizes masterwork tier 4 Sovereign Crown.
  - `action:sell_armaments`: Fulfills knight guild orders, selling finished stock for gold and artisan prestige.
  - `action:upgrade_forge`: Upgrades anvil and bellows ($250).
  - `action:advance_day`: Quenches the forge hearth, pays workshop lease, and admits new royal contracts.
- **Victory & Defeat**:
  - Victory: Craft at least 1 Crown of the High Sovereign and amass >= $3,000 in treasury gold.
  - Defeat: Bankruptcy (gold falls below -$300) or turn expiration without completing the crown.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `day`: integer
- `gold`: integer (starting $350)
- `forgeLevel`: integer (starting 1)
- `materials`: object { timber, ore, ingots, gems, dust }
- `crafted`: object { shields, axes, runicBlades, crowns }
- `itemsDelivered`: integer
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized crafting state.
- `legalActions(state)`: Returns non-empty list of available smithing, harvesting, and commercial actions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean simulation completion flag.
- `score(state)`: Evaluates master artificer score.
