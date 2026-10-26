(function (root) {
  'use strict';

  const MAX_STEPS = 150;

  function nextRandom(state) {
    state.rng = ((state.rng * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rng / 0x7fffffff;
  }

  function createBoard() {
    const board = [];
    for (let r = 0; r < 8; r++) {
      const row = new Array(8).fill(0);
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) row[c] = -1; // AI man
          else if (r > 4) row[c] = 1; // Player man
        }
      }
      board.push(row);
    }
    return board;
  }

  function createState(seed = 12345) {
    const curRng = (seed >>> 0) || 1;

    return {
      board: createBoard(),
      stepCount: 0,
      playerPieces: 12,
      aiPieces: 12,
      won: false,
      gameOver: false,
      stats: {
        playerCaptures: 0,
        aiCaptures: 0,
      },
      rng: curRng,
    };
  }

  function getMovesForSide(board, side) {
    const moves = [];
    const jumps = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const val = board[r][c];
        if (side === 1 && val > 0) {
          const isKing = val === 2;
          const dirs = isKing
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            : [[-1, -1], [-1, 1]];

          for (let d = 0; d < dirs.length; d++) {
            const dr = dirs[d][0];
            const dc = dirs[d][1];

            // 1. Check regular move
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === 0) {
              moves.push(`${r},${c}->${nr},${nc}`);
            }

            // 2. Check jump
            const jr = r + 2 * dr;
            const jc = c + 2 * dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && board[jr][jc] === 0) {
              const midVal = board[nr][nc];
              if (midVal < 0) {
                jumps.push(`${r},${c}->${jr},${jc}`);
              }
            }
          }
        } else if (side === -1 && val < 0) {
          const isKing = val === -2;
          const dirs = isKing
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            : [[1, -1], [1, 1]];

          for (let d = 0; d < dirs.length; d++) {
            const dr = dirs[d][0];
            const dc = dirs[d][1];

            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === 0) {
              moves.push(`${r},${c}->${nr},${nc}`);
            }

            const jr = r + 2 * dr;
            const jc = c + 2 * dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && board[jr][jc] === 0) {
              const midVal = board[nr][nc];
              if (midVal > 0) {
                jumps.push(`${r},${c}->${jr},${jc}`);
              }
            }
          }
        }
      }
    }

    // Mandatory capture rule: if any jumps exist, only jumps are legal
    return jumps.length > 0 ? jumps : moves;
  }

  function isOver(state) {
    return (
      state.gameOver ||
      state.playerPieces <= 0 ||
      state.aiPieces <= 0 ||
      state.stepCount >= MAX_STEPS
    );
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    return getMovesForSide(state.board, 1);
  }

  function applyMove(state, moveStr, side) {
    const parts = moveStr.split('->');
    const [fromR, fromC] = parts[0].split(',').map(Number);
    const [toR, toC] = parts[1].split(',').map(Number);

    const val = state.board[fromR][fromC];
    state.board[fromR][fromC] = 0;

    let isJump = Math.abs(toR - fromR) === 2;
    if (isJump) {
      const midR = Math.floor((fromR + toR) / 2);
      const midC = Math.floor((fromC + toC) / 2);
      state.board[midR][midC] = 0;

      if (side === 1) {
        state.aiPieces -= 1;
        state.stats.playerCaptures += 1;
      } else {
        state.playerPieces -= 1;
        state.stats.aiCaptures += 1;
      }
    }

    // King promotion
    let finalVal = val;
    if (side === 1 && toR === 0 && val === 1) {
      finalVal = 2; // Player King
    } else if (side === -1 && toR === 7 && val === -1) {
      finalVal = -2; // AI King
    }

    state.board[toR][toC] = finalVal;
    return isJump;
  }

  function step(state, action) {
    if (!action || typeof action !== 'string' || !action.includes('->')) {
      throw new Error('Invalid action format: ' + action);
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    const legal = getMovesForSide(state.board, 1);
    if (!legal.includes(action)) {
      throw new Error('Illegal move: ' + action);
    }

    let reward = 0;
    const playerJumped = applyMove(state, action, 1);
    reward += playerJumped ? 25 : 2;

    // Check if player won
    if (state.aiPieces <= 0) {
      state.won = true;
      state.gameOver = true;
      reward += 100;
      state.stepCount += 1;
      return { reward, done: true };
    }

    // AI turn
    const aiMoves = getMovesForSide(state.board, -1);
    if (aiMoves.length === 0) {
      // AI has no legal moves -> Player wins!
      state.won = true;
      state.gameOver = true;
      reward += 100;
      state.stepCount += 1;
      return { reward, done: true };
    }

    // Pick AI move (priority: jumps first, then king promotions, then random)
    let bestAiMove = aiMoves[0];
    const aiJumps = aiMoves.filter((m) => {
      const parts = m.split('->');
      return Math.abs(parseInt(parts[0][0], 10) - parseInt(parts[1][0], 10)) === 2;
    });

    if (aiJumps.length > 0) {
      const idx = Math.floor(nextRandom(state) * aiJumps.length);
      bestAiMove = aiJumps[idx];
    } else {
      const idx = Math.floor(nextRandom(state) * aiMoves.length);
      bestAiMove = aiMoves[idx];
    }

    const aiJumped = applyMove(state, bestAiMove, -1);
    if (aiJumped) {
      reward -= 15;
    }

    // Check if AI won
    if (state.playerPieces <= 0) {
      state.gameOver = true;
      reward -= 50;
      state.stepCount += 1;
      return { reward, done: true };
    }

    // Check if player has moves for next turn
    const nextPlayerMoves = getMovesForSide(state.board, 1);
    if (nextPlayerMoves.length === 0) {
      state.gameOver = true;
      reward -= 50;
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    let kingsCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (state.board[r][c] === 2) kingsCount++;
      }
    }

    return (
      (state.won ? 500 : 0) +
      state.playerPieces * 35 +
      kingsCount * 45 -
      state.aiPieces * 15 +
      state.stats.playerCaptures * 20
    );
  }

  const api = {
    MAX_STEPS,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GameLogic = api;
  }
})(typeof self !== 'undefined' ? self : globalThis);
