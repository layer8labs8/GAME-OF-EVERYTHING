(function (root) {
  'use strict';

  const MAX_STEPS = 150;

  const PIECE_VALUES = {
    P: 100,
    N: 320,
    B: 330,
    R: 500,
    Q: 900,
    K: 20000,
  };

  const KNIGHT_OFFSETS = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];

  const KING_OFFSETS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  const BISHOP_DIRS = [
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];

  const ROOK_DIRS = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  function nextRandom(state) {
    state.rngState = ((state.rngState * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rngState / 0x7fffffff;
  }

  function sqToCoord(sq) {
    const col = sq.charCodeAt(0) - 97;
    const row = 8 - parseInt(sq[1], 10);
    return { r: row, c: col };
  }

  function coordToSq(r, c) {
    return String.fromCharCode(97 + c) + (8 - r);
  }

  function cloneBoard(board) {
    const copy = new Array(8);
    for (let r = 0; r < 8; r++) {
      copy[r] = board[r].slice();
    }
    return copy;
  }

  function createInitialBoard() {
    return [
      ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
      ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
      ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
    ];
  }

  function createState(seed = 12345) {
    return {
      board: createInitialBoard(),
      castling: {
        wK: true,
        wQ: true,
        bK: true,
        bQ: true,
      },
      epSquare: null,
      stepCount: 0,
      gameOver: false,
      winner: null,
      inCheck: {
        w: false,
        b: false,
      },
      stats: {
        whiteCaptures: [],
        blackCaptures: [],
        movesHistory: [],
      },
      scoreVal: 0,
      rngState: (seed >>> 0) || 12345,
    };
  }

  function isSquareAttacked(board, targetR, targetC, attackerSide) {
    // 1. Pawn attacks
    const pawnRow = attackerSide === 'w' ? targetR + 1 : targetR - 1;
    if (pawnRow >= 0 && pawnRow < 8) {
      if (targetC - 1 >= 0 && board[pawnRow][targetC - 1] === attackerSide + 'P') return true;
      if (targetC + 1 < 8 && board[pawnRow][targetC + 1] === attackerSide + 'P') return true;
    }

    // 2. Knight attacks
    for (let i = 0; i < KNIGHT_OFFSETS.length; i++) {
      const nr = targetR + KNIGHT_OFFSETS[i][0];
      const nc = targetC + KNIGHT_OFFSETS[i][1];
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (board[nr][nc] === attackerSide + 'N') return true;
      }
    }

    // 3. Bishop & Queen diagonal rays
    for (let i = 0; i < BISHOP_DIRS.length; i++) {
      const dr = BISHOP_DIRS[i][0];
      const dc = BISHOP_DIRS[i][1];
      let cr = targetR + dr;
      let cc = targetC + dc;
      while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8) {
        const piece = board[cr][cc];
        if (piece) {
          if (piece === attackerSide + 'B' || piece === attackerSide + 'Q') return true;
          break;
        }
        cr += dr;
        cc += dc;
      }
    }

    // 4. Rook & Queen orthogonal rays
    for (let i = 0; i < ROOK_DIRS.length; i++) {
      const dr = ROOK_DIRS[i][0];
      const dc = ROOK_DIRS[i][1];
      let cr = targetR + dr;
      let cc = targetC + dc;
      while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8) {
        const piece = board[cr][cc];
        if (piece) {
          if (piece === attackerSide + 'R' || piece === attackerSide + 'Q') return true;
          break;
        }
        cr += dr;
        cc += dc;
      }
    }

    // 5. King adjacent
    for (let i = 0; i < KING_OFFSETS.length; i++) {
      const nr = targetR + KING_OFFSETS[i][0];
      const nc = targetC + KING_OFFSETS[i][1];
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (board[nr][nc] === attackerSide + 'K') return true;
      }
    }

    return false;
  }

  function findKing(board, side) {
    const target = side + 'K';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === target) return { r, c };
      }
    }
    return null;
  }

  function isKingInCheck(board, side) {
    const kingPos = findKing(board, side);
    if (!kingPos) return true;
    const opponent = side === 'w' ? 'b' : 'w';
    return isSquareAttacked(board, kingPos.r, kingPos.c, opponent);
  }

  function getPseudoMoves(board, side, castling, epSquare) {
    const moves = [];
    const opp = side === 'w' ? 'b' : 'w';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece[0] !== side) continue;
        const type = piece[1];

        if (type === 'P') {
          const dir = side === 'w' ? -1 : 1;
          const startRank = side === 'w' ? 6 : 1;
          const promoRank = side === 'w' ? 0 : 7;

          // Single advance
          const fwdR = r + dir;
          if (fwdR >= 0 && fwdR < 8 && !board[fwdR][c]) {
            if (fwdR === promoRank) {
              moves.push(coordToSq(r, c) + '-' + coordToSq(fwdR, c) + '=Q');
            } else {
              moves.push(coordToSq(r, c) + '-' + coordToSq(fwdR, c));
            }

            // Double advance from start rank
            const dblR = r + 2 * dir;
            if (r === startRank && !board[dblR][c]) {
              moves.push(coordToSq(r, c) + '-' + coordToSq(dblR, c));
            }
          }

          // Diagonal captures
          const capCols = [c - 1, c + 1];
          for (let i = 0; i < capCols.length; i++) {
            const cc = capCols[i];
            if (cc >= 0 && cc < 8) {
              const target = board[fwdR][cc];
              if (target && target[0] === opp) {
                if (fwdR === promoRank) {
                  moves.push(coordToSq(r, c) + '-' + coordToSq(fwdR, cc) + '=Q');
                } else {
                  moves.push(coordToSq(r, c) + '-' + coordToSq(fwdR, cc));
                }
              } else if (epSquare && epSquare.r === fwdR && epSquare.c === cc) {
                // En passant
                moves.push(coordToSq(r, c) + '-' + coordToSq(fwdR, cc));
              }
            }
          }
        } else if (type === 'N') {
          for (let i = 0; i < KNIGHT_OFFSETS.length; i++) {
            const nr = r + KNIGHT_OFFSETS[i][0];
            const nc = c + KNIGHT_OFFSETS[i][1];
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const target = board[nr][nc];
              if (!target || target[0] === opp) {
                moves.push(coordToSq(r, c) + '-' + coordToSq(nr, nc));
              }
            }
          }
        } else if (type === 'B' || type === 'R' || type === 'Q') {
          const dirs = [];
          if (type === 'B' || type === 'Q') dirs.push(...BISHOP_DIRS);
          if (type === 'R' || type === 'Q') dirs.push(...ROOK_DIRS);

          for (let i = 0; i < dirs.length; i++) {
            const dr = dirs[i][0];
            const dc = dirs[i][1];
            let cr = r + dr;
            let cc = c + dc;
            while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8) {
              const target = board[cr][cc];
              if (!target) {
                moves.push(coordToSq(r, c) + '-' + coordToSq(cr, cc));
              } else {
                if (target[0] === opp) {
                  moves.push(coordToSq(r, c) + '-' + coordToSq(cr, cc));
                }
                break;
              }
              cr += dr;
              cc += dc;
            }
          }
        } else if (type === 'K') {
          for (let i = 0; i < KING_OFFSETS.length; i++) {
            const nr = r + KING_OFFSETS[i][0];
            const nc = c + KING_OFFSETS[i][1];
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const target = board[nr][nc];
              if (!target || target[0] === opp) {
                moves.push(coordToSq(r, c) + '-' + coordToSq(nr, nc));
              }
            }
          }

          // Castling
          if (side === 'w' && r === 7 && c === 4) {
            if (castling.wK && !board[7][5] && !board[7][6] && board[7][7] === 'wR') {
              if (!isSquareAttacked(board, 7, 4, 'b') && !isSquareAttacked(board, 7, 5, 'b') && !isSquareAttacked(board, 7, 6, 'b')) {
                moves.push('e1-g1');
              }
            }
            if (castling.wQ && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0] === 'wR') {
              if (!isSquareAttacked(board, 7, 4, 'b') && !isSquareAttacked(board, 7, 3, 'b') && !isSquareAttacked(board, 7, 2, 'b')) {
                moves.push('e1-c1');
              }
            }
          } else if (side === 'b' && r === 0 && c === 4) {
            if (castling.bK && !board[0][5] && !board[0][6] && board[0][7] === 'bR') {
              if (!isSquareAttacked(board, 0, 4, 'w') && !isSquareAttacked(board, 0, 5, 'w') && !isSquareAttacked(board, 0, 6, 'w')) {
                moves.push('e8-g8');
              }
            }
            if (castling.bQ && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0] === 'bR') {
              if (!isSquareAttacked(board, 0, 4, 'w') && !isSquareAttacked(board, 0, 3, 'w') && !isSquareAttacked(board, 0, 2, 'w')) {
                moves.push('e8-c8');
              }
            }
          }
        }
      }
    }

    return moves;
  }

  function simulateMove(board, moveStr, side, epSquare) {
    const nextBoard = cloneBoard(board);
    const parts = moveStr.split('-');
    const fromCoord = sqToCoord(parts[0]);
    const toStr = parts[1].split('=')[0];
    const toCoord = sqToCoord(toStr);

    const piece = nextBoard[fromCoord.r][fromCoord.c];
    nextBoard[fromCoord.r][fromCoord.c] = null;

    // En passant capture
    if (piece[1] === 'P' && epSquare && toCoord.r === epSquare.r && toCoord.c === epSquare.c) {
      const oppPawnRow = side === 'w' ? toCoord.r + 1 : toCoord.r - 1;
      nextBoard[oppPawnRow][toCoord.c] = null;
    }

    // Castling rook move
    if (piece === 'wK' && moveStr === 'e1-g1') {
      nextBoard[7][7] = null;
      nextBoard[7][5] = 'wR';
    } else if (piece === 'wK' && moveStr === 'e1-c1') {
      nextBoard[7][0] = null;
      nextBoard[7][3] = 'wR';
    } else if (piece === 'bK' && moveStr === 'e8-g8') {
      nextBoard[0][7] = null;
      nextBoard[0][5] = 'bR';
    } else if (piece === 'bK' && moveStr === 'e8-c8') {
      nextBoard[0][0] = null;
      nextBoard[0][3] = 'bR';
    }

    // Pawn promotion
    if (piece[1] === 'P' && (toCoord.r === 0 || toCoord.r === 7)) {
      nextBoard[toCoord.r][toCoord.c] = side + 'Q';
    } else {
      nextBoard[toCoord.r][toCoord.c] = piece;
    }

    return nextBoard;
  }

  function getLegalMovesForSide(board, side, castling, epSquare) {
    const pseudo = getPseudoMoves(board, side, castling, epSquare);
    const legal = [];

    for (let i = 0; i < pseudo.length; i++) {
      const move = pseudo[i];
      const nextBoard = simulateMove(board, move, side, epSquare);
      if (!isKingInCheck(nextBoard, side)) {
        legal.push(move);
      }
    }

    return legal;
  }

  function executeMoveOnState(state, moveStr, side) {
    const parts = moveStr.split('-');
    const fromCoord = sqToCoord(parts[0]);
    const toRaw = parts[1];
    const toStr = toRaw.split('=')[0];
    const toCoord = sqToCoord(toStr);

    const piece = state.board[fromCoord.r][fromCoord.c];
    state.board[fromCoord.r][fromCoord.c] = null;

    let captured = state.board[toCoord.r][toCoord.c];

    // En passant capture
    if (piece[1] === 'P' && state.epSquare && toCoord.r === state.epSquare.r && toCoord.c === state.epSquare.c) {
      const oppPawnRow = side === 'w' ? toCoord.r + 1 : toCoord.r - 1;
      captured = state.board[oppPawnRow][toCoord.c];
      state.board[oppPawnRow][toCoord.c] = null;
    }

    // Set new EP square if pawn advanced 2 squares
    if (piece[1] === 'P' && Math.abs(toCoord.r - fromCoord.r) === 2) {
      state.epSquare = {
        r: (fromCoord.r + toCoord.r) / 2,
        c: fromCoord.c,
      };
    } else {
      state.epSquare = null;
    }

    // Castling rook move & revoke rights
    if (piece === 'wK') {
      state.castling.wK = false;
      state.castling.wQ = false;
      if (moveStr === 'e1-g1') {
        state.board[7][7] = null;
        state.board[7][5] = 'wR';
      } else if (moveStr === 'e1-c1') {
        state.board[7][0] = null;
        state.board[7][3] = 'wR';
      }
    } else if (piece === 'bK') {
      state.castling.bK = false;
      state.castling.bQ = false;
      if (moveStr === 'e8-g8') {
        state.board[0][7] = null;
        state.board[0][5] = 'bR';
      } else if (moveStr === 'e8-c8') {
        state.board[0][0] = null;
        state.board[0][3] = 'bR';
      }
    } else if (piece === 'wR') {
      if (fromCoord.r === 7 && fromCoord.c === 0) state.castling.wQ = false;
      if (fromCoord.r === 7 && fromCoord.c === 7) state.castling.wK = false;
    } else if (piece === 'bR') {
      if (fromCoord.r === 0 && fromCoord.c === 0) state.castling.bQ = false;
      if (fromCoord.r === 0 && fromCoord.c === 7) state.castling.bK = false;
    }

    // If opponent rook is captured in corner, revoke opponent's castling
    if (toCoord.r === 0 && toCoord.c === 0) state.castling.bQ = false;
    if (toCoord.r === 0 && toCoord.c === 7) state.castling.bK = false;
    if (toCoord.r === 7 && toCoord.c === 0) state.castling.wQ = false;
    if (toCoord.r === 7 && toCoord.c === 7) state.castling.wK = false;

    // Promotion
    if (piece[1] === 'P' && (toCoord.r === 0 || toCoord.r === 7)) {
      state.board[toCoord.r][toCoord.c] = side + 'Q';
    } else {
      state.board[toCoord.r][toCoord.c] = piece;
    }

    if (captured) {
      if (side === 'w') {
        state.stats.whiteCaptures.push(captured);
      } else {
        state.stats.blackCaptures.push(captured);
      }
    }

    state.stats.movesHistory.push(moveStr);

    // Update inCheck status
    const oppSide = side === 'w' ? 'b' : 'w';
    state.inCheck[oppSide] = isKingInCheck(state.board, oppSide);
    state.inCheck[side] = isKingInCheck(state.board, side);

    return captured;
  }

  function evaluateBoard(board) {
    let evalScore = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        const color = piece[0];
        const type = piece[1];
        let val = PIECE_VALUES[type] || 0;

        // Positional center bias
        if (type === 'P' || type === 'N' || type === 'B') {
          if ((r === 3 || r === 4) && (c === 3 || c === 4)) {
            val += 20;
          } else if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
            val += 10;
          }
        }

        if (color === 'w') {
          evalScore += val;
        } else {
          evalScore -= val;
        }
      }
    }

    return evalScore;
  }

  function pickBestAiMove(state, legalMoves) {
    if (legalMoves.length === 0) return null;

    let bestMove = legalMoves[0];
    let bestScore = Infinity; // Black wants to minimize evalScore

    for (let i = 0; i < legalMoves.length; i++) {
      const move = legalMoves[i];
      const nextBoard = simulateMove(state.board, move, 'b', state.epSquare);
      let score = evaluateBoard(nextBoard);

      // Bonus if move gives check to White
      if (isKingInCheck(nextBoard, 'w')) {
        score -= 25;
      }

      // Small jitter using deterministic RNG to avoid identical tie stalemates
      const jitter = nextRandom(state) * 2;
      const finalScore = score + jitter;

      if (finalScore < bestScore) {
        bestScore = finalScore;
        bestMove = move;
      }
    }

    return bestMove;
  }

  function isOver(state) {
    if (state.gameOver) return true;
    if (state.stepCount >= MAX_STEPS) return true;

    // King capture safety check
    if (!findKing(state.board, 'w') || !findKing(state.board, 'b')) return true;

    return false;
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    return getLegalMovesForSide(state.board, 'w', state.castling, state.epSquare);
  }

  function score(state) {
    return state.scoreVal;
  }

  function step(state, action) {
    if (!action || typeof action !== 'string' || !action.includes('-')) {
      throw new Error('Invalid move action format: ' + action);
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    const whiteMoves = getLegalMovesForSide(state.board, 'w', state.castling, state.epSquare);
    // Allow matching without '=Q' if player supplies 'e7-e8' when 'e7-e8=Q' is in legal moves
    let matchedMove = whiteMoves.find((m) => m === action);
    if (!matchedMove && action.indexOf('=') === -1) {
      matchedMove = whiteMoves.find((m) => m.startsWith(action + '='));
    }

    if (!matchedMove) {
      throw new Error('Illegal move for White: ' + action);
    }

    let reward = 1;

    // Execute White move
    const captured = executeMoveOnState(state, matchedMove, 'w');
    if (captured) {
      const pVal = PIECE_VALUES[captured[1]] || 50;
      const gain = Math.floor(pVal / 10);
      reward += gain;
      state.scoreVal += gain;
    }

    if (state.inCheck.b) {
      reward += 15;
      state.scoreVal += 15;
    }

    // Check if Black has any legal moves
    const blackMoves = getLegalMovesForSide(state.board, 'b', state.castling, state.epSquare);
    if (blackMoves.length === 0) {
      if (state.inCheck.b) {
        // Checkmate! White wins!
        state.gameOver = true;
        state.winner = 'w';
        reward += 200;
        state.scoreVal += 200;
        state.stepCount += 1;
        return { reward, done: true };
      } else {
        // Stalemate
        state.gameOver = true;
        state.winner = 'draw';
        reward += 10;
        state.scoreVal += 10;
        state.stepCount += 1;
        return { reward, done: true };
      }
    }

    // AI Counter-turn (Black)
    const bestAiMove = pickBestAiMove(state, blackMoves);
    if (bestAiMove) {
      const aiCaptured = executeMoveOnState(state, bestAiMove, 'b');
      if (aiCaptured) {
        const pVal = PIECE_VALUES[aiCaptured[1]] || 50;
        const loss = Math.floor(pVal / 10);
        reward -= loss;
        state.scoreVal -= loss;
      }

      if (state.inCheck.w) {
        reward -= 10;
      }

      // Check if White now has legal moves
      const nextWhiteMoves = getLegalMovesForSide(state.board, 'w', state.castling, state.epSquare);
      if (nextWhiteMoves.length === 0) {
        if (state.inCheck.w) {
          // Checkmate! Black wins (White lost)
          state.gameOver = true;
          state.winner = 'b';
          reward -= 100;
          state.scoreVal -= 50;
          state.stepCount += 1;
          return { reward, done: true };
        } else {
          // Stalemate
          state.gameOver = true;
          state.winner = 'draw';
          reward += 5;
          state.stepCount += 1;
          return { reward, done: true };
        }
      }
    }

    state.stepCount += 1;
    if (state.stepCount >= MAX_STEPS) {
      state.gameOver = true;
      if (!state.winner) state.winner = 'draw';
    }

    const done = isOver(state);
    return { reward, done };
  }

  const chessLogic = {
    MAX_STEPS,
    PIECE_VALUES,
    createState,
    legalActions,
    isOver,
    score,
    step,
    sqToCoord,
    coordToSq,
    isSquareAttacked,
    isKingInCheck,
    getLegalMovesForSide,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = chessLogic;
  } else {
    root.chessLogic = chessLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
