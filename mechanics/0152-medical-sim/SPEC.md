# 0152-medical-sim: Trauma Ward

An intense surgical and emergency room simulation inspired by Trauma Center: Under the Knife and Surgeon Simulator. Players take on the role of Chief Trauma Surgeon, monitoring patient vitals (Heart Rate, Blood Pressure, Stability), executing precision four-phase operations (Anesthesia, Incision, Hemostasis/Suction, Organ Repair, Suturing), and administering emergency resuscitation to save lives under pressure.

## Core Pillars & Mechanics

- **Patient Vitals & Physiological Monitoring**:
  - `stability`: Physiological stamina (0-100%). Low stability triggers cardiac arrest.
  - `heartRate`: Beats per minute (40 to 180 bpm). Elevated during trauma; drops in shock.
  - `bloodLoss`: Hemorrhage index (0-100%). Reduces blood pressure and accelerates stability decline.
  - `surgicalPhase`: 
    - `0: Pre-Op`: Patient intake and sedation.
    - `1: Incision`: Precision cut using surgical scalpel.
    - `2: Hemostasis`: Suction fluid and cauterize bleeding vessels.
    - `3: Core Procedure`: Repair organ laceration, extract shrapnel, or graft tissue.
    - `4: Closure`: Suture incisions and apply sterile dressing.
- **Surgical Equipment & Directives**:
  - `action:administer_sedation`: Injects anesthetic, steadying heart rate and boosting stability (+15 Stability).
  - `action:scalpel_incision`: Opens surgical field, advancing from Phase 0 to Phase 1.
  - `action:cauterize_and_suction`: Clears hemorrhage and seals bleeding vessels (-30 Blood Loss, advances to Phase 2).
  - `action:execute_repair`: Repairs internal trauma and excises pathology (advances to Phase 3).
  - `action:suture_and_close`: Completes the surgery, discharges patient, collects fees and reputation.
  - `action:defibrillate`: Emergency shock when stability is critically low (< 25%) to reset cardiac rhythm.
  - `action:admit_next_patient`: Admits the next critical trauma case from incoming ambulances.
- **Victory & Defeat**:
  - Victory: Successfully discharge at least 10 critical surgical patients with >= 80% Surgeon Reputation and >= $2,000 Hospital Funds.
  - Defeat: License revoked (3 patient fatalities or reputation drops to 0) or bankruptcy (funds < -$200).
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `funds`: integer (starting $400)
- `reputation`: integer (starting 75%)
- `patientsSaved`: integer
- `fatalities`: integer
- `currentPatient`: object
  - `id`: string
  - `name`: string
  - `condition`: string
  - `stability`: integer (0-100)
  - `heartRate`: integer
  - `bloodLoss`: integer
  - `phase`: integer (0 to 4)
  - `payout`: integer
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized medical surgical state.
- `legalActions(state)`: Returns non-empty list of available clinical and surgical procedures.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns boolean simulation completion flag.
- `score(state)`: Evaluates surgical efficiency score.
