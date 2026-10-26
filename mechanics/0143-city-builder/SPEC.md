# 0143 — City Builder ("Metro Grid")

## Concept
A compact municipal urban management simulation. Plan and govern an 8x8 metropolitan district by laying transit infrastructure, designating residential, commercial, and industrial zones, curating public parks, balancing fiscal budgets, and growing a flourishing, happy metropolis.

## District Grid & Zones
- 8x8 municipal grid.
- Tile types:
  - `.` Unzoned natural terrain
  - `R` Paved road network (provides essential road connectivity for development)
  - `RES` Residential zone (attracts citizens; demands jobs and parks)
  - `COM` Commercial district (provides retail and services; generates sales tax)
  - `IND` Industrial district (manufactures goods; generates corporate tax; causes local pollution)
  - `PARK` Municipal botanical park (neutralizes industrial smog and boosts resident happiness)

## Economics & Simulation Tick
- **Construction Costs**:
  - Road: $10
  - Residential Zone: $25
  - Commercial Zone: $35
  - Industrial Zone: $50
  - Park: $40
  - Demolish: $5
- **Monthly Fiscal Cycle (`next_month`)**:
  - Connected residential zones attract +25 citizens each.
  - Connected commercial zones generate +$15 tax revenue per 50 citizens.
  - Connected industrial zones generate +$30 corporate tax.
  - Road upkeep costs $1 per road segment.
  - Happiness calculated based on employment ratio (residents vs commercial/industrial jobs), park proximity (+15%), and industrial smog (-20% if adjacent).

## Action Space
- `'cursor_up'`, `'cursor_down'`, `'cursor_left'`, `'cursor_right'`: Navigate municipal planning cursor.
- `'build_road'`, `'zone_residential'`, `'zone_commercial'`, `'zone_industrial'`, `'build_park'`, `'demolish'`: Construct at cursor.
- `'next_month'`: Advance fiscal calendar month, process taxes, and update population.

## Victory & Termination
- **Victory**: Reach 300 citizens with municipal happiness >= 70% within 48 months.
- **Defeat**: Municipal bankruptcy (funds < 0 with unpaid upkeep) or exceeding `MAX_STEPS = 180`.
