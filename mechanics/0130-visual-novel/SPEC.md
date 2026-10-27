# 0130-visual-novel: Echoes of Starlight

Interactive branching sci-fi visual novel featuring multi-route character relationships, dynamic affection/trust meters, dialogue trees, CG scene unlocks, and 4 distinct narrative endings aboard the deep-space starship *Astraea*.

## Core Mechanics
- **Dialogue Progression**: Advancing narrative lines with character sprites, emotion expressions, and background settings.
- **Affection / Trust System**:
  - `lyra`: Chief Astrophysicist (+affinity for scientific curiosity, star navigation, and sincerity).
  - `vance`: Lead Pilot (+affinity for boldness, tactical grit, and protective instincts).
  - `aria`: Synthetic Archivist (+affinity for empathy, history preservation, and self-awareness).
- **Branching Decision Nodes**:
  - Chapter 1: The Anomalous Beacon (Choice: Scan signal, Hail frequency, or Deploy probe).
  - Chapter 2: The Crystal Nebula (Choice: Chart uncharted rift with Lyra, Test thrusters with Vance, or Decrypt core with Aria).
  - Chapter 3: Crisis at the Event Horizon (Decisive route fork determining story resolution).
- **Multiple Endings**:
  - Ending A: *Transcendent Horizons* (Lyra Romance / Science True Route).
  - Ending B: *Defenders of the Rim* (Vance Partnership / Pilot Route).
  - Ending C: *Synthetic Awakening* (Aria Humanity Route).
  - Ending D: *Lost to the Void* (Defeat / Failure to align systems).

## State Schema
- `seed`: integer PRNG seed
- `currentNodeId`: string (scene / line identifier)
- `stepCount`: integer (0 to 60)
- `maxSteps`: 60
- `score`: integer
- `done`: boolean
- `victory`: boolean
- `ending`: string or null
- `affinity`:
  - `lyra`: integer (0 to 10)
  - `vance`: integer (0 to 10)
  - `aria`: integer (0 to 10)
- `flags`: object of unlocked story flags
- `cgsUnlocked`: array of string CG IDs
- `dialogue`:
  - `speaker`: string ('Lyra', 'Vance', 'Aria', 'Narrator')
  - `expression`: string ('neutral', 'happy', 'serious', 'surprised')
  - `text`: string
  - `background`: string ('bridge', 'nebula', 'laboratory', 'observatory')
- `choices`: array of string choice options (empty if linear line)

## Actions
- `advance`: Progress to next dialogue beat when no choices are pending.
- `choose:<index>`: Select choice 0, 1, or 2 at branching decision nodes.

## Scoring & Termination
- **Victory**: Achieving any of the 3 character route endings (Endings A, B, or C). Reward: `1.0`.
- **Defeat**: Triggering the Void Failure ending or running out of steps. Reward: `0.0`.
- **Score**: `(victory ? 3000 : 0) + (affinity.lyra + affinity.vance + affinity.aria) * 150 + cgsUnlocked.length * 200`.
