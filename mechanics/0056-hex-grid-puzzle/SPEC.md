# 0056: Hex Grid Puzzle - Hexa Conduits

A tactical sci-fi energy grid puzzle played on a 19-tile hexagonal field with axial coordinates. The player rotates hexagonal conduit cells to channel radiant plasma from the central Power Core to illuminate all peripheral Energy Relays.

## Core Rules

1. **Hexagonal Grid Topology**:
   - 19 hexagonal cells arranged in a radius-2 hex board centered at $(0, 0)$.
   - Axial coordinates $(q, r)$ satisfying $\max(|q|, |r|, |q + r|) \le 2$.
   - Each hexagon has 6 directional faces ($0..5$):
     - $0$: $(+1, 0)$ East
     - $1$: $(0, +1)$ Southeast
     - $2$: $(-1, +1)$ Southwest
     - $3$: $(-1, 0)$ West
     - $4$: $(0, -1)$ Northwest
     - $5$: $(+1, -1)$ Northeast
   - Opposite face of direction $d$ is $(d + 3) \bmod 6$.

2. **Tile Architecture**:
   - **Power Core** (Tile 0, at origin $(0, 0)$): Constant emitter of plasma energy. Locked against rotation.
   - **Energy Relays**: Peripheral terminal nodes requiring power connection to clear the circuit.
   - **Conduits**: Rotating hex conduits with internal wire channels:
     - Straight line ($180^\circ$ through): $[0, 3]$
     - Tight bend ($60^\circ$ curve): $[0, 1]$
     - Wide bend ($120^\circ$ curve): $[0, 2]$
     - 3-Way Fork (Y-junction): $[0, 2, 4]$
     - 4-Way Cross: $[0, 1, 3, 4]$
   - Effective wire directions of a tile are `(baseWire + rotation) % 6`.

3. **Power Conduction & Connections**:
   - Power propagates outward from the Power Core via breadth-first search.
   - Two adjacent tiles $A$ and $B$ connect along direction $d$ if and only if:
     - Tile $A$ contains an active wire facing direction $d$, AND
     - Tile $B$ contains an active wire facing opposite direction $(d + 3) \bmod 6$.
   - Powered tiles radiate glow and energize connected adjacent conduits.

4. **Actions & Turn Budget**:
   - Action space: `rotate:1`, `rotate:2`, ..., `rotate:18` (rotates tile $i$ by $60^\circ$ clockwise), plus `wait`.
   - Max rotations per stage: 50 rotations.
   - 3 consecutive stages of increasing complexity.

5. **Scoring & End Conditions**:
   - Victory: Successfully power all energy relays across all 3 stages.
   - Defeat: Exceeding rotation budget (`rotations >= maxRotations`).
   - `score = stagesCleared * 400 + poweredRelays * 60 + (won ? 600 : 0) - totalRotations * 2`.
