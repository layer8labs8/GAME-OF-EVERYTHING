# 0061: Hacking Puzzle - Cyber Breach

A tactical cyber-infiltration puzzle. The operative infiltrates a corporate subnet by routing through a $5 \times 5$ hexadecimal code matrix, alternating between horizontal row and vertical column selections to reconstruct target daemon sequences within a restricted memory buffer.

## Core Rules

1. **Code Matrix & Alternating Axis**:
   - $5 \times 5$ grid populated with hex byte tokens (`1C`, `BD`, `55`, `E9`, `7A`, `FF`).
   - Selections alternate strictly between row and column axes:
     - Move 1 must select a byte from the initial active row (Row 0).
     - The selected cell's column becomes the active column for the subsequent pick.
     - The next selected cell's row becomes the active row, alternating back and forth.
   - Selected cells are consumed and cannot be re-selected.

2. **Memory Buffer & Target Daemons**:
   - Maximum buffer capacity: 5 bytes (`bufferLimit: 5`).
   - Each stage specifies 2 to 3 target daemon payloads (e.g. `[1C, BD, 55]`).
   - A daemon is successfully uploaded if its exact sequence appears as a contiguous subsequence in the operative's buffer.
   - Buffer overflow: selecting bytes beyond the buffer capacity without meeting breach requirements causes a security lockout.

3. **Actions**:
   - `pick:r,c`: Selects byte at row $r$, column $c$. Legal only if the cell lies on the currently active line (row or column) and has not already been used.

4. **Progression & Scoring**:
   - Uploading all target daemons breaches the current ICE layer and advances to the next network tier.
   - 3 sequential ICE security tiers: Perimeter Firewall, Subnet Switch, and Neural Core.
   - Victory: Successfully breach all 3 ICE layers.
   - Defeat: Buffer fills without completing required daemons or reaching maximum failed breach attempts.
   - `score = layersBreached * 400 + daemonsUploaded * 60 + (won ? 500 : 0) - totalPicks * 5`.
