# 0134-detective: Murder at Midnight

A classic Victorian murder mystery deduction game inspired by Agatha Christie, Sherlock Holmes, and Ace Attorney. Lord Reginald Sterling is murdered in his manor study. Players examine crime scene clues, interrogate suspects, expose contradictory alibis using gathered physical evidence, and deliver the final indictment against the true culprit.

## Core Mechanics

- **Manor Exploration & Crime Scenes**:
  - `Study`: The central crime scene containing Lord Sterling's body, a shattered antique watch, a poisoned wine goblet, and a locked desk compartment.
  - `Library`: Archival hall containing the estate ledger, a torn last will and testament, and a hollowed encyclopedia.
  - `Conservatory`: Ornate Victorian glasshouse containing rare botanical nightshade, distinctive red mud footprints, and garden pruning shears.
- **Deduction & Investigation Loop**:
  - `examine:<clue_id>`: Uncover forensic evidence and add it to the Case Dossier.
  - `question:<suspect_id>`: Hear testimonies and recorded alibis.
  - `confront:<suspect_id>:<evidence_id>`: Present physical proof that demolishes an alibi or exposes a hidden motive.
  - `accuse:<suspect_id>`: Deliver the formal accusation to Inspector Lestrade.
- **Suspects**:
  - `lady_sterling`: The grieving widow claiming she never left her bedchamber.
  - `prof_hawthorne`: The academic nephew whose university debts hinged on Lord Sterling's inheritance.
  - `butler_graves`: The estate butler claiming continuous presence in the cellar.
- **Deterministic Case Generation**:
  - Seed determines the true culprit, ensuring replayability and full testability.
  - Evidence clues, footprints, and motives dynamically align with the selected culprit.
- **Victory & Defeat**:
  - Victory: Accuse the true culprit with at least 2 substantiated contradictions/evidence links established.
  - Defeat: Accuse an innocent party or make an accusation with insufficient proof, or exceed 150 investigative turns.

## State Schema
- `seed`: integer
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `room`: string ('study' | 'library' | 'conservatory')
- `culprit`: string ('lady_sterling' | 'prof_hawthorne' | 'butler_graves')
- `evidence`: array of discovered evidence IDs
- `examinedTargets`: object tracking inspected scene objects
- `contradictionsFound`: integer count of successfully presented contradictions
- `suspectStatus`: object tracking suspect composure, alibi status, and exposed lies
- `caseNotes`: array of narrative log strings
- `score`: integer
- `done`: boolean
- `victory`: boolean

## Pure Bot Contract
- `createState(seed)`: Returns initialized detective case state.
- `legalActions(state)`: Returns available investigation, interrogation, confrontation, and accusation options.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns game completion flag.
- `score(state)`: Evaluates investigative score.
