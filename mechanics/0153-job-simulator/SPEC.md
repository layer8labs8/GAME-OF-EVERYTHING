# 0153-job-simulator: Office Mayhem

An engaging cubicle corporate satire and multitasking job simulator. Players assume the role of an ambitious corporate clerk at Megacorp Inc., juggling document stamping, report printing, confidential memo shredding, coffee brewing, supply restocking, and delivering urgent assignments to the executive suite before deadlines expire.

## Core Pillars & Mechanics

- **Workplace Vitals & Performance**:
  - `energy`: Physical stamina (0-100%). Sinks as actions are executed; restored through espresso brewing, water cooler breaks, and power naps.
  - `stress`: Mental strain (0-100%). Escalates when pending tasks linger or deadlines lapse; mitigated by casual chats, coffee breaks, and stress-relieving shredder runs. Reaching 100 triggers corporate burnout!
  - `performance`: Professional evaluation score (0-100%). Rises when assignments are turned in promptly; drops when tasks expire. Reaching 0 triggers termination!
  - `salary`: Accumulated compensation ($). Earned on successful task delivery and spent restocking essential supplies.
  - `jobTitle`: Corporate hierarchy rank:
    - Junior Clerk
    - Account Specialist
    - Senior Manager
    - Vice President
- **Office Stations & Actions**:
  - `action:stamp_contracts`: Stamps legal paperwork at the inbox desk, producing signed contracts.
  - `action:print_reports`: Operates the office copier, consuming paper reams to generate executive reports.
  - `action:shred_documents`: Feeds sensitive records into the shredder, reducing desk clutter and stress.
  - `action:brew_coffee`: Consumes coffee beans to brew espresso, boosting energy and easing stress.
  - `action:water_cooler_chat`: Engages with coworkers by the water dispenser to relieve stress.
  - `action:restock_supplies`: Orders paper reams and coffee beans from office depot for a minor expense.
  - `action:take_power_nap`: Discreet rest beneath the cubicle desk to recover substantial energy.
  - `action:deliver_task:<taskId>`: Fulfills a pending corporate work order by turning in required deliverables.
  - `action:ask_for_promotion`: Petitions the board for a title elevation when qualification criteria are satisfied.
- **Victory & Defeat**:
  - Victory: Attain the rank of Vice President (requires completing at least 12 tasks, $2,400+ salary, and >= 85% performance).
  - Defeat: Suffer burnout (stress reaches 100), get fired for incompetence (performance falls to 0), or accumulate 5 failed tasks.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `energy`: integer (0 to 100)
- `stress`: integer (0 to 100)
- `performance`: integer (0 to 100)
- `salary`: integer (starts at 350)
- `jobTitle`: string
- `items`: object
  - `coffeeBeans`: integer
  - `paperReams`: integer
  - `reportsPrinted`: integer
  - `contractsSigned`: integer
  - `shreddedMemos`: integer
- `tasks`: array of objects
  - `id`: string
  - `type`: string ('report', 'contract', 'coffee_run', 'compliance')
  - `description`: string
  - `requiredCount`: integer
  - `deadlineTurns`: integer
  - `reward`: integer
- `nextTaskId`: integer
- `tasksCompleted`: integer
- `tasksFailed`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
