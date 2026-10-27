# 0079-chess: Classic Chess

A pure, deterministic implementation of standard international chess played on an 8x8 board. The player commands the White army against an intelligent deterministic AI commander controlling Black.

## Core Rules & Features
- **Board & Setup**: 8x8 board with rank/file algebraic notation (a1 through h8). White occupies ranks 1-2, Black occupies ranks 7-8.
- **Piece Movements**:
  - **Pawns**: Single square advance, initial two-square push, diagonal single-square captures, en passant captures, and promotion to Queen upon reaching the opposing back rank.
  - **Knights**: Standard L-shaped jumps (2 by 1) unobstructed by intermediate pieces.
  - **Bishops**: Diagonal ray movement until blocked by friendly piece or capturing opposing piece.
  - **Rooks**: Orthogonal rank/file ray movement until blocked.
  - **Queens**: Combined ray mobility of rook and bishop.
  - **Kings**: Single square in any 8 directions, kingside (`e1-g1` / `e8-g8`) and queenside (`e1-c1` / `e8-c8`) castling when path is clear, neither piece has moved, and king is neither currently in nor traverses check.
- **King Safety & Check**: Any move leaving one's own King under enemy attack is strictly illegal. If a player is in check with no legal evasions, it is checkmate (game over). If a player has no legal moves and is not in check, it is stalemate (draw).
- **Move Format**: Standard algebraic coordinate notation: `"{from}-{to}"` (e.g. `"e2-e4"`, `"g1-f3"`, `"e1-g1"` for kingside castle, `"e7-e8=Q"` for pawn promotion).
- **Bot Contract**:
  - `createState(seed)`: Initializes deterministic game state with standard board layout, piece counts, castling rights, and RNG seed.
  - `legalActions(state)`: Returns array of valid coordinate move strings for White. If game is over, returns `[]`.
  - `step(state, action)`: Applies player's move, verifies legality, updates board and captures, then computes and applies AI countermove. Returns `{ reward, done }`.
  - `isOver(state)`: Returns true if checkmate, stalemate, King capture, or move limit reached.
  - `score(state)`: Net material and positional evaluation score.
