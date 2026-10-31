# 0137-dating-sim: Starcross Academy

A classic Japanese-style Dating Simulation. Players manage daily schedules across 14 academic days leading to the Autumn Starlight Festival, balancing stats (Intellect, Charm, Athletics, Stress), purchasing romantic gifts, conversing with three distinct heroines, and making the pivotal festival confession.

## Core Pillars & Mechanics

- **Heroines & Social Links**:
  - `Aria Vance`: The reserved astronomy valedictorian. Values high `intellect` and celestial discussions.
  - `Chloe Rivera`: The spirited varsity track captain. Values high `athletics` and morning runs.
  - `Serena Laurent`: The elegant conservatory cellist. Values high `charm` and artistic aesthetics.
- **Stat Management**:
  - `intellect`: Boosted via library study sessions.
  - `athletics`: Boosted via gymnasium drills.
  - `charm`: Boosted via art and style practice.
  - `stress`: Accumulates during rigorous activities; reduced through courtyard relaxation and cafe visits.
  - `allowance`: Daily stipend to purchase gifts from the Campus Boutique.
- **Dating & Social Interactions**:
  - `activity:study`, `activity:train`, `activity:art`, `activity:rest`.
  - `talk:<heroine>`: Daily campus conversation; effectiveness scales with associated stat.
  - `date:<heroine>:<venue>`: Weekend outings (Planetarium, Track, Art Cafe) boosting affection and unlocking CG memories.
  - `gift:<heroine>`: Deliver thoughtful presents (Star Map for Aria, Running Shoes for Chloe, Sheet Music for Serena).
- **Festival Climax & Confession**:
  - On Day 14, player confesses under the Starlight Clock Tower (`confess:<heroine>`).
  - Victory: Affection >= 70 with the chosen heroine and requisite stat qualifications met.
  - Defeat: Confession declined or stress exceeds 100 causing academic burnout.

## State Schema
- `seed`: integer
- `day`: integer (1 to 14)
- `maxDays`: 14
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `intellect`: integer (starting 10)
- `athletics`: integer (starting 10)
- `charm`: integer (starting 10)
- `stress`: integer (starting 0, max 100)
- `allowance`: integer (starting 30)
- `affection`: object { aria: 0, chloe: 0, serena: 0 }
- `datesCount`: object { aria: 0, chloe: 0, serena: 0 }
- `giftsGiven`: object { aria: 0, chloe: 0, serena: 0 }
- `cgUnlocked`: array of unlocked memory string IDs
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `dialogue`: array of narrative strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized dating sim state.
- `legalActions(state)`: Returns available study, training, social, dating, and confession options.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns game completion flag.
- `score(state)`: Evaluates social and relationship score.
