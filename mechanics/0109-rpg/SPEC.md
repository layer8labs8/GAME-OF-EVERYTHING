# 0109-rpg: Hero's Quest

A classic turn-based role-playing game (RPG) featuring character attribute progression, equipment upgrades, spellcasting, inventory management, and an epic 5-zone monster gauntlet concluding with the Abyssal Dragon.

## Core Rules & Features
- **Hero Attributes & Derived Stats**:
  - `STR` (Strength): Increases physical melee attack damage and maximum HP.
  - `AGI` (Agility): Increases critical strike chance and initiative.
  - `INT` (Intellect): Increases magic spell damage, maximum MP, and healing potency.
  - Base Stats (Level 1): 80 HP, 40 MP, 12 STR, 10 AGI, 10 INT, 2 Health Potions, 1 Mana Potion.
- **5 Progression Zones**:
  - Zone 1: Whispering Woods (Dire Wolf, 35 HP).
  - Zone 2: Sunken Catacombs (Skeleton Warlord, 60 HP).
  - Zone 3: Dragonfang Ridge (Mountain Troll, 90 HP).
  - Zone 4: Shadow Citadel (Black Knight, 130 HP).
  - Zone 5: Throne of Chaos (Abyssal Dragon, 200 HP).
- **Combat & Encounter Phase**:
  - `attack`: Physical strike with equipped weapon (`DMG = STR * 1.5 + WeaponBonus - EnemyArmor`).
  - `cast_fireball`: Consumes 12 MP. Unleashes explosive spell (`DMG = INT * 2.2`).
  - `cast_heal`: Consumes 10 MP. Restores `INT * 2.5` HP.
  - `defend`: Parries next blow (halves enemy strike) and recovers 6 MP.
  - `use_potion:hp`: Restores 45 HP.
  - `use_potion:mp`: Restores 30 MP.
- **Leveling & Character Customization**:
  - Upon defeating zone monsters, hero gains XP and Gold.
  - Leveling up prompts attribute allocation:
    - `stat_boost:str` (+3 STR, +10 Max HP)
    - `stat_boost:agi` (+3 AGI, +5 Max HP)
    - `stat_boost:int` (+3 INT, +10 Max MP)
- **Equipment & Merchant Upgrades**:
  - `buy_upgrade:weapon` (Upgrades to Steel Blade / Runeblade, +8 ATK, costs 50 Gold).
  - `buy_upgrade:armor` (Upgrades to Plate Mail / Dragonmail, +6 DEF, costs 45 Gold).
  - `buy_potion:hp` (Cost 20 Gold).
  - `travel_next_zone`: Advances to the next zone when current area is cleared.
- **Termination & Score**:
  - **Victory**: Slay the Abyssal Dragon in Zone 5.
  - **Defeat**: Hero HP reaches 0.
  - **Score**: Zones cleared, hero level, gold accumulated, monsters slain, and final health.
- **Bot Contract**:
  - `createState(seed)`: Initializes hero, inventory, and zone 1 encounter.
  - `legalActions(state)`: Returns valid tactical combat choices, shop purchases, stat boosts, and zone travel.
  - `step(state, action)`: Applies orders, runs monster counter-attack, returns `{ reward, done }`.
  - `isOver(state)`: Returns boolean terminal state.
  - `score(state)`: Evaluates roleplaying achievement and survival.
