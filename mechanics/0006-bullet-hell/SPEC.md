# 0006 — Bullet Hell ("Danmaku Veil")

## Concept
A micro-hitbox curtain-fire aerial shooter. Thread through intricate geometric bullet spirals, graze hazardous projectiles to charge the celestial bomb meter, and vanquish the Crimson Core flagship.

## Arena & Kinematics
- Vertical combat corridor (360 width x 500 height logical playfield).
- **Core Hitbox**: The player fighter is 24x24 px visually, but has a precise 4-pixel radius glowing core hitbox at its center.
- **Graze Radius**: Enemy bullets passing between 5 and 16 pixels from the core trigger "Graze" sparks, generating +5 score and charging the Bomb meter.
- **Movement**:
  - Standard glide: Swift repositioning across the playfield.
  - Focused movement (`focus_left`, `focus_right`, `focus_up`, `focus_down`): Precision micro-dodging at half speed with condensed forward twin-cannon fire.

## Danmaku Patterns & Boss
- **The Crimson Core**:
  - Health: 150 HP across 3 evolving bullet phases.
  - **Phase 1: Spiral Blossoms**: Clockwise and counter-clockwise rotating ring bursts.
  - **Phase 2: Radial Petals**: Dense expanding geometric rings with narrow gaps.
  - **Phase 3: Crossfire Tempest**: Rapid alternating streams coupled with target-seeking needles.
- **Celestial Bomb**:
  - Consumes full bomb meter (charges from 20 grazes or 50 regular steps).
  - Instantly evaporates all hostile bullets on screen and inflicts 25 burst damage on the boss.

## Action Space
- `'left'`, `'right'`, `'up'`, `'down'`: Standard flight maneuver (speed 16 px).
- `'focus_left'`, `'focus_right'`: Focused micro-stepping (speed 8 px).
- `'bomb'`: Detonate screen-clearing celestial bomb (when bomb meter is full).
- `'wait'`: Hold flight position while auto-cannons fire.

## Victory & Termination
- Deplete the Crimson Core's HP to achieve victory.
- Losing all 3 shield hulls or exceeding `MAX_STEPS = 160` triggers defeat.
