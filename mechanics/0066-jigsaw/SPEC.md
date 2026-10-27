# 0066: Jigsaw - Stained Glass Jigsaw

A tactile, aesthetic jigsaw puzzle celebrating artisanal stained-glass mosaics. Players assemble interlocking pieces featuring authentic tabs and blanks into a target frame, matching edge shapes and colorful chromatic glass segments to reconstruct the complete artwork.

## Core Rules

1. **Jigsaw Grid & Edge Interlocking**:
   - Board grid dimensions:
     - Stage 1: $3 \times 3$ (9 pieces)
     - Stage 2: $3 \times 4$ (12 pieces)
     - Stage 3: $4 \times 4$ (16 pieces)
   - Each piece has 4 edge contours: `top`, `right`, `bottom`, `left`:
     - Flat edge (`0`): Must align with outer frame borders.
     - Outward Tab (`+1`): Interlocks with a concave blank (`-1`).
     - Inward Blank (`-1`): Interlocks with a convex tab (`+1`).
   - A placement at $(r, c)$ is legal if and only if all boundary edges are flat (`0`) and all adjacent placed neighbors have complementary edge contours ($edge_A + edge_B = 0$).

2. **Tray & Board Management**:
   - Pieces begin scrambled in the artisan tray.
   - Players select pieces and place them into valid slots on the board.
   - Pieces can be removed back to the tray to re-evaluate tricky connections.

3. **Actions**:
   - `place:pieceId,r,c`: Places piece from tray into empty cell $(r, c)$ if interlocking edges match.
   - `remove:r,c`: Picks placed piece from board back to tray.
   - `clear`: Returns all placed pieces back to tray.

4. **Progression & Scoring**:
   - Stage is completed when all pieces are assembled into the stained-glass frame.
   - 3 progressive mosaic motifs: Sunset Lighthouse, Emerald Dragon, Cosmic Nebula.
   - Move budget: 40 moves per stage.
   - Victory: Successfully complete all 3 stained-glass mosaics.
   - Defeat: Exceeding move budget (`moves >= maxMoves`).
   - `score = stagesCompleted * 500 + correctPlacements * 30 + (won ? 500 : 0) - totalMoves`.
