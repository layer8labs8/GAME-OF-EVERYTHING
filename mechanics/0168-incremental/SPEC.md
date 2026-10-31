# 0168-incremental: Quantum Forge Incremental

An exponential multi-tiered incremental simulation. Players begin by harvesting subatomic matter, constructing tiered particle accelerators and quantum computers, executing quantum inversions to accumulate Entangled Cubits, and powering a Singularity Engine to trigger Universal Genesis.

## Core Pillars & Mechanics

- **Multi-Tier Resource Economy**:
  - `matter`: Base physical substance extracted from the quantum foam.
  - `energy`: Concentrated power synthesized by particle accelerators.
  - `entangledCubits`: Prestige quantum currency harvested during Quantum Inversion (provides +100% compounding production multiplier per cubit).
- **Automated Facilities**:
  - `synthesizer`: +2 matter/turn.
  - `splitter`: +10 matter/turn, +1 energy/turn.
  - `accelerator`: +40 matter/turn, +5 energy/turn.
  - `quantumComputer`: +150 matter/turn, +20 energy/turn.
  - `singularityEngine`: +800 matter/turn, +100 energy/turn.
- **Scientific Researches**:
  - `matterCompression`: Doubles manual synthesis output.
  - `superconductivity`: +50% global production yield.
  - `quantumResonance`: Boosts cubit effectiveness.
- **Prestige & Extraction**:
  - `Quantum Inversion`: Resets Matter, Energy, and Facilities in exchange for Entangled Cubits (requires >= 200 Energy).
  - `Universal Genesis`: Triggered once owning at least 1 Singularity Engine, >= 3 Entangled Cubits, and accumulating >= 100,000 Matter.
- **Victory & Defeat**:
  - Victory: Execute `action:trigger_universal_genesis` meeting all tier requirements.
  - Defeat: Reaching 120 turns without achieving Universal Genesis.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-120)
- `maxTurns`: 120
- `matter`: integer
- `energy`: integer
- `cubits`: integer
- `facilities`: object (synthesizer, splitter, accelerator, quantumComputer, singularityEngine)
- `researches`: object (matterCompression, superconductivity, quantumResonance)
- `inversionsPerformed`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
