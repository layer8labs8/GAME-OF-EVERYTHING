# 0004 — Boss Rush ("Titan Trials")

## Concept
A high-stakes gladiatorial boss gauntlet pitting a solitary hero against 3 consecutive colossal titans. Features stamina management, telegraphed boss windups, precision parrying, invulnerability dodging, and tactical resource conservation.

## Gauntlet Titans
1. **Iron Golem** (HP: 90): Heavy telegraphed overhead slams and sweeping hammer blows.
2. **Storm Chimera** (HP: 120): Lightning charges, swift double swipes, and electric breath.
3. **Obsidian Wyrm** (HP: 160): Magma burst, tail sweep, and berserk phase frenzy.

## Combat Mechanics
- **Player Attributes**:
  - `hp` (Max 100): Depletion results in loss.
  - `stamina` (Max 100): Required for offensive actions and active defense.
  - `potions` (Count: 2): Restores 35 HP.
  - `combo`: Increments on successful strikes; grants damage scaling bonus.
- **Telegraphing & Defense**:
  - Bosses signal impending attacks with a 1-turn windup state (`OVERHEAD_SLAM`, `SWEEP_CLEAVE`, `FLAME_BREATH`).
  - **Parry**: If the player parries an incoming attack during its strike turn, damage is negated, stamina is restored, and the boss is stunned for 2 turns.
  - **Dodge**: Grants invulnerability frames against unparryable wide attacks.
  - **Rest**: Focuses defense and recovers +40 stamina.

## Action Space
- `'light_slash'`: 12 base damage (+combo bonus), costs 15 stamina.
- `'heavy_smash'`: 28 base damage, costs 35 stamina.
- `'parry'`: Prepares defensive deflection stance for the current turn.
- `'dodge'`: Evades incoming damage, costs 20 stamina.
- `'heal'`: Consumes 1 potion flask to recover 35 HP.
- `'rest'`: Catches breath to restore 40 stamina.

## Victory & Termination
- Defeat all 3 titans to achieve glorious victory.
- Player HP reaching 0 or step count exceeding `MAX_STEPS = 150` triggers defeat.
