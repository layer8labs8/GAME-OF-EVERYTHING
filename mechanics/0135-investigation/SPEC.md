# 0135-investigation: Crime Scene Reconstruction

A forensic investigation simulation inspired by Return of the Obra Dinn, CSI, and forensic trace reconstruction. Players examine a high-security vault breach crime scene using specialized forensic tools (UV Luminol, Spectrometer, Ballistics Laser, Cipher Decoder), collect trace evidence, sequence the chronological timeline of events, and compile the definitive reconstruction report.

## Core Mechanics

- **Crime Scene Stations**:
  - `vault_door`: Heavy titanium barrier breached by intense directional heat.
  - `security_console`: Scrambled digital terminal controlling laser grid tripwires.
  - `glass_display`: Shattered biometric vitrine from which the Chronos Relic was stolen.
  - `ventilation_shaft`: High-altitude air intake grid showing tool marks and synthetic fiber.
- **Forensic Tool Suite**:
  - `tool:uv_luminol`: Illuminates latent chemical trails, prints, and invisible residue.
  - `tool:spectrometer`: Analyzes isotopic composition of scorch marks and explosive residue.
  - `tool:ballistics_laser`: Reconstructs projectile trajectories, vantage points, and angles.
  - `tool:cipher_decoder`: Recovers scrambled digital audit logs and timestamp indices.
- **Trace Evidence & Clues**:
  - `thermite_residue`: Chemical compound confirming 2400°C military thermal charge.
  - `optic_trajectory`: Trajectory line proving camera was disabled from the ceiling vent.
  - `corrupted_timestamps`: Recovered log entries pinning sequence moments to 03:12 - 03:18 AM.
  - `synthetic_fiber`: Ballistic-grade nylon fiber snagged on intake louvers.
  - `vitrine_impact`: Shatter pattern confirming interior decompression strike.
- **Timeline Reconstruction Matrix**:
  - As forensic clues are uncovered, the investigator locks chronological timeline slots (Phase 1 through Phase 4):
    - `phase_1`: "Optic Disablement" (Laser projectile fired from ventilation duct).
    - `phase_2`: "Thermal Breach" (Thermite burn melts vault door locking pins).
    - `phase_3`: "Console Override" (Cipher bypass scrambles electronic fail-safe).
    - `phase_4`: "Vitrine Extraction" (Display glass shattered; Relic retrieved).
- **Report Finalization**:
  - `action:finalize_report`: Verifies timeline consistency and seals the forensic audit.
- **Victory & Defeat**:
  - Victory: All 4 timeline phases correctly verified and report finalized.
  - Defeat: Maximum investigative steps (150 turns) reached before timeline resolution.

## State Schema
- `seed`: integer
- `turns`: integer (0 to 150)
- `maxTurns`: 150
- `station`: string ('vault_door' | 'security_console' | 'glass_display' | 'ventilation_shaft')
- `evidence`: array of string IDs
- `stationScans`: object tracking completed forensic tool scans per station
- `timelineSlots`: object mapping phases ('phase_1', 'phase_2', 'phase_3', 'phase_4') to assigned events
- `verifiedPhases`: integer count (0 to 4)
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `log`: array of strings

## Pure Bot Contract
- `createState(seed)`: Returns initialized forensic case state.
- `legalActions(state)`: Returns available station travel, tool scan, timeline assignment, and report submission actions.
- `step(state, action)`: Pure state transition returning `{ reward, done }`.
- `isOver(state)`: Returns game completion flag.
- `score(state)`: Evaluates forensic investigative score.
