# 0003 — Beat 'Em Up ("Street Brawler")

## Concept
A classic 2.5D side-scrolling street brawler. Navigate depth lanes, execute punch combos, jump kicks, and explosive flaming dragon uppercuts to neutralize syndicates and reclaim the city.

## Arena & Depth Lanes
- 2.5D street corridor (horizontal X: `[20..340]`, 3 discrete depth lanes: `0` [background], `1` [midground], `2` [foreground]).
- Vertical depth shifts allow tactical dodging and lane flanking.

## Combat Moves
- **Punch Combo**: 3-stage progressive combo:
  - Hit 1: Jab (12 damage, +1 combo)
  - Hit 2: Straight (16 damage, +1 combo)
  - Hit 3: Knockdown Hook (28 damage, knocks enemy down)
- **Jump Kick**: Airborne flying thrust that damages foes across the current and adjacent lanes (20 damage).
- **Dragon Uppercut (Super)**: Consumes 50 super gauge; unleashes a multi-hit spinning inferno dealing 45 damage to all foes in range.
- **Street Food**: Defeated thugs occasionally drop roast chicken or apples that restore +30 HP.

## Action Space
- `'left'`, `'right'`: Advance horizontally.
- `'lane_up'`, `'lane_down'`: Shift depth lane.
- `'punch'`: Execute combo blow against foes on same lane.
- `'jump_kick'`: Leap attack striking current and adjacent lanes.
- `'super'`: Execute dragon uppercut (available when super gauge >= 50).
- `'pick_food'`: Consume nearby ground sustenance.
- `'wait'`: Hold combat stance.

## Victory & Termination
- Neutralize all 8 syndicate thugs across 2 waves to win.
- Depleting all 100 player HP or exceeding `MAX_STEPS = 160` results in defeat.
