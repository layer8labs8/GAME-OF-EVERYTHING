# 0171-music-based-procedural-generation: Beat Odyssey

A rhythm-driven procedural highway racer inspired by *Audiosurf*, *Beat Hazard*, and *Thumper*. An audio waveform engine procedurally synthesizes frequency spectra (Bass, Mid, Treble) and BPM measure intensity from the game seed, mapping audio energy into track gradients, harmonic score rings, and sonic distortion barriers across a three-lane synthesizer grid.

## Core Pillars & Mechanics

- **Procedural Audio Generation**:
  - Track Length: 100 musical measures / beats.
  - Beat Waveform: Evaluates frequency amplitudes `f(measure)` for Bass (0-100), Mid (0-100), and Treble (0-100).
  - High Bass spikes spawn Sonic Hazards (barriers requiring evasion or sonic blast).
  - High Mid/Treble harmonies spawn Chroma Gems and Boost Rings (+points, +shield repair, +combo).
- **Vitals & Ship Telemetry**:
  - `lane`: 0 (Left), 1 (Center), 2 (Right).
  - `shield`: (0-100%). Sinks on hitting unmitigated sonic barriers; restored by Harmonizer Rings.
  - `energy`: (0-100%). Charged by collecting Chroma Gems; expended on Sonic Blasts and Overdrive.
  - `combo`: Consecutive harmonic beats collected (multipliers from 1x to 8x).
  - `measure`: Progress through the procedural song (0 to 100).
- **Tactical Flight Actions**:
  - `action:shift_lane:left`: Shifts ship left (-1 lane).
  - `action:shift_lane:right`: Shifts ship right (+1 lane).
  - `action:ride_beat`: Stays in lane and glides in sync with the current audio pulse.
  - `action:pulse_sonic_blast`: Fires forward frequency shockwave to vaporize upcoming dissonance barriers (-20 energy).
  - `action:engage_overdrive`: Burns 30 energy to enter supersonic flow state, doubling points and invulnerability.
- **Victory & Defeat**:
  - Victory: Complete all 100 measures to reach the track outro with shields intact.
  - Defeat: Shield health reaches 0 or turns reach maxTurns (120).

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-120)
- `maxTurns`: 120
- `lane`: integer (0 to 2)
- `shield`: integer (starts at 100)
- `energy`: integer (starts at 30)
- `measure`: integer (0 to 100)
- `combo`: integer
- `track`: array of objects (measure slices containing obstacles and harmonic pickups)
- `overdriveTurns`: integer
- `gemsCollected`: integer
- `barriersCleared`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
