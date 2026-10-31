# 0141-management: Apex Clinic

A comprehensive healthcare facility management simulation. Players oversee hospital operations (Triage, Radiology, Pharmacy, Surgery), manage professional staff (Doctors, Nurses, Orderlies), balance operating budgets, maintain clinical hygiene, and maximize reputation by curing patient queues.

## Core Pillars & Mechanics

- **Clinical Departments & Facilities**:
  - `Triage`: Initial examination desk where incoming patients are diagnosed.
  - `Pharmacy`: Dispenses therapeutics for common ailments.
  - `Radiology`: High-precision scanning suite for complex internal trauma.
  - `Surgery`: Critical care operating theater for life-threatening emergencies.
- **Staffing & Operations**:
  - `hire:doctor`: Expands diagnostic accuracy and surgical bandwidth ($150 hire, $30 daily wage).
  - `hire:nurse`: Accelerates triage intake and medication dispensing ($100 hire, $20 daily wage).
  - `hire:orderly`: Maintains sterile clinic hygiene, preventing hospital-acquired outbreaks ($80 hire, $15 daily wage).
  - `action:train_staff`: Enhances cure rates and diagnostic speed across all active departments.
- **Financial & Operational Balance**:
  - `funds`: Currency balance. Revenue earned upon discharging cured patients ($60 to $180 per patient).
  - `reputation`: Public trust rating (0 to 100%). Drops if patients leave untreated or hygiene falls.
  - `hygiene`: Cleanliness index (0 to 100%). Low hygiene increases patient complication rates.
  - `patientsTreated`: Cumulative count of successful medical discharges.
- **Daily Operating Loop**:
  - `action:process_queue`: Directs medical personnel to treat pending patients.
  - `action:sanitize_clinic`: Conducts rapid sterilization sweep (+25% Hygiene).
  - `action:expand_capacity`: Adds treatment beds and clinic wings ($200).
  - `action:end_shift`: Concludes the operating day, reconciles staff payroll, and admits new patients.
- **Victory & Defeat**:
  - Victory: Treat at least 40 patients with >= 80% Reputation and a healthy treasury ($1,000+).
  - Defeat: Bankruptcy (funds fall below -$500) or reputation drops to 0.
  - Bounded: 150 turns max guarantee.

## State Schema
- `seed`: integer
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `day`: integer
- `funds`: integer (starting $800)
- `reputation`: integer (starting 70%)
- `hygiene`: integer (starting 90%)
- `staff`: object { doctors: 2, nurses: 2, orderlies: 1 }
- `capacity`: integer (starting 6 beds)
- `patientQueue`: array of patient objects { id, type, severity, treated: boolean }
- `patientsTreated`: integer
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized hospital management state.
- `legalActions(state)`: Returns non-empty list of available administrative, clinical, and staffing actions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns simulation completion flag.
- `score(state)`: Evaluates hospital management score.
