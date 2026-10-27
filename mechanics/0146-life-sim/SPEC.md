# 0146-life-sim: Metro Life

A comprehensive modern life simulation inspired by The Sims, BitLife, and Jones in the Fast Lane. Players navigate adulthood across sequential calendar weeks, balancing career advancement, higher education, physical health, psychological happiness, and financial wealth to achieve professional fulfillment.

## Core Pillars & Mechanics

- **Vitals & Wellness**:
  - `energy`: Action stamina (0-100%). Depleted by labor and study; restored by restful sleep.
  - `health`: Physical fitness (0-100%). Elevated via gym workouts; degrades if malnourished or overstressed.
  - `happiness`: Mental wellbeing (0-100%). Boosted through socializing and recreation.
  - `intellect`: Academic & professional aptitude (0-100%). Gained through continuous university coursework.
- **Corporate Career Ladder**:
  - `Level 0: Intern` ($200 / week salary, requires 0 Intellect).
  - `Level 1: Junior Associate` ($450 / week salary, requires 25 Intellect).
  - `Level 2: Senior Manager` ($900 / week salary, requires 50 Intellect).
  - `Level 3: Division Director` ($1,800 / week salary, requires 75 Intellect).
  - `Level 4: Chief Executive Officer (CEO)` ($3,500 / week salary, requires 90 Intellect).
- **Life Directives & Weekly Actions**:
  - `action:work_shift`: Perform work duties (Earns current salary, +15 Performance, -25 Energy).
  - `action:study_course`: Attend evening university class (+10 Intellect, -$150 tuition, -20 Energy).
  - `action:gym_workout`: Exercise at fitness center (+15 Health, +5 Happiness, -$40 fee, -15 Energy).
  - `action:socialize`: Dining out with close companions (+20 Happiness, -$60 expenses, -10 Energy).
  - `action:rest_and_recharge`: Deep restorative sleep (+35 Energy, +5 Health).
  - `action:apply_promotion`: Sit for board promotion interview when performance >= 60 and intellect threshold met.
  - `action:advance_week`: Concludes current week, deducts rent & grocery living costs ($250), checks burnout.
- **Victory & Defeat**:
  - Victory: Attain CEO executive position (Career Level 4) with >= $8,000 net savings and >= 70% Happiness.
  - Defeat: Bankruptcy (wealth falls below -$800) or total physical/emotional collapse (health <= 0 or happiness <= 0).
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `week`: integer (calendar week)
- `wealth`: integer (starting $600)
- `energy`: integer (0 to 100)
- `health`: integer (0 to 100)
- `happiness`: integer (0 to 100)
- `intellect`: integer (0 to 100)
- `careerLevel`: integer (0 to 4)
- `performance`: integer (0 to 100)
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized life simulation state.
- `legalActions(state)`: Returns non-empty list of available life decisions and actions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean simulation completion flag.
- `score(state)`: Evaluates life achievement score.
