# 0178-score-attack: Arcade Blast

A fast-paced neon arcade score-attack game. Players blast high-value gemstone targets, sustain relentless combo multipliers, manage an adrenaline frenzy meter, and dodge explosive hazard skulls to breach the legendary 75,000-point Platinum Trophy threshold before the arcade clock expires.

## Core Pillars & Mechanics

- **Target Slots & Spawn Dynamics**:
  - 4 target slots on the active arcade matrix:
    - `ruby`: +150 base pts, common.
    - `sapphire`: +300 base pts, uncommon.
    - `emerald`: +600 base pts, boosts combo timer.
    - `diamond`: +1,200 base pts, rare high-yield bounty.
    - `skull`: Hazard trap! Inflicts -400 pts, breaks combo streak, and chips shield integrity.
- **Combo & Multiplier Mechanics**:
  - `combo`: Increments with each clean gem hit (1, 2, 3...).
  - `comboMultiplier`: `1 + Math.floor(combo / 3)`, capped at 10x!
  - `comboDecay`: Ticks down by 1 each step without a hit; if combo expires, multiplier resets to 1x.
- **Frenzy Mode**:
  - `frenzyMeter`: Fills by +12% per gem blast.
  - At 100%, allows `action:trigger_frenzy_burst`:
    - Quadruples points scored.
    - Blasts all targets simultaneously with a sweeping wave.
    - Grants 5 frenzy turns of invulnerability and max multiplier.
- **Actions**:
  - `action:blast_target:<slot>`: Shoots target at slot index (0, 1, 2, 3).
  - `action:charge_overdrive_laser`: Fires a concentrated beam clearing all slots.
  - `action:trigger_frenzy_burst`: Activates Frenzy Overdrive mode when meter reaches 100%.
  - `action:refresh_targets`: Shuffles all target slots with fresh spawns.
- **Victory & Defeat**:
  - Victory: Reach or exceed 75,000 points (Platinum Medal Milestone) within 80 turns.
  - Defeat: Shield depleted to 0 (by hitting 3 hazard skulls), or turns reach 80 without achieving the 50,000-point Gold Medal standard.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-80)
- `maxTurns`: 80
- `points`: integer
- `combo`: integer
- `comboMultiplier`: integer (1-10x)
- `comboDecay`: integer
- `frenzyMeter`: integer (0-100%)
- `frenzyActive`: integer (remaining frenzy turns)
- `shield`: integer (starts at 3)
- `slots`: array of target objects (type, points)
- `gemsCleared`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
