(function (root) {
  'use strict';

  const MAX_STEPS = 150;

  function nextRandom(state) {
    state.rngState = ((state.rngState * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rngState / 0x7fffffff;
  }

  function rollTwoDice(state) {
    const d1 = Math.floor(nextRandom(state) * 6) + 1;
    const d2 = Math.floor(nextRandom(state) * 6) + 1;
    if (d1 === d2) {
      return [d1, d1, d1, d1];
    }
    return [d1, d2];
  }

  function createInitialBoard() {
    // Points 1 through 24
    const b = {};
    for (let i = 1; i <= 24; i++) {
      b[i] = { count: 0, color: null };
    }

    // Standard starting positions
    // White moves 24 -> 1
    b[24] = { count: 2, color: 'w' };
    b[13] = { count: 5, color: 'w' };
    b[8]  = { count: 3, color: 'w' };
    b[6]  = { count: 5, color: 'w' };

    // Black moves 1 -> 24
    b[1]  = { count: 2, color: 'b' };
    b[12] = { count: 5, color: 'b' };
    b[17] = { count: 3, color: 'b' };
    b[19] = { count: 5, color: 'b' };

    return b;
  }

  function createState(seed = 12345) {
    const s = {
      board: createInitialBoard(),
      whiteBar: 0,
      blackBar: 0,
      whiteOff: 0,
      blackOff: 0,
      currentDice: [],
      lastRoll: [],
      stepCount: 0,
      gameOver: false,
      winner: null,
      log: ['Backgammon started. White rolls first.'],
      rngState: (seed >>> 0) || 12345,
    };

    s.currentDice = rollTwoDice(s);
    s.lastRoll = s.currentDice.slice();
    s.log.push(`White rolled [${s.currentDice.join(', ')}].`);
    return s;
  }

  function canWhiteBearOff(state) {
    if (state.whiteBar > 0) return false;
    for (let pt = 7; pt <= 24; pt++) {
      if (state.board[pt].color === 'w' && state.board[pt].count > 0) {
        return false;
      }
    }
    return true;
  }

  function canBlackBearOff(state) {
    if (state.blackBar > 0) return false;
    for (let pt = 1; pt <= 18; pt++) {
      if (state.board[pt].color === 'b' && state.board[pt].count > 0) {
        return false;
      }
    }
    return true;
  }

  function getLegalMovesForWhite(state) {
    const moves = [];
    const diceSet = Array.from(new Set(state.currentDice)); // unique dice to avoid duplicate actions

    for (let d = 0; d < diceSet.length; d++) {
      const die = diceSet[d];

      // 1. Re-entry from bar
      if (state.whiteBar > 0) {
        const targetPt = 25 - die;
        const targetCell = state.board[targetPt];
        if (!targetCell || targetCell.color !== 'b' || targetCell.count < 2) {
          moves.push(`enter:${die}`);
        }
        continue;
      }

      // 2. Normal moves and Bearing off
      const canBear = canWhiteBearOff(state);

      for (let pt = 1; pt <= 24; pt++) {
        const cell = state.board[pt];
        if (cell.color === 'w' && cell.count > 0) {
          const targetPt = pt - die;

          if (targetPt >= 1) {
            const destCell = state.board[targetPt];
            if (destCell.color !== 'b' || destCell.count < 2) {
              moves.push(`move:${pt}:${die}`);
            }
          } else if (canBear) {
            if (targetPt === 0) {
              moves.push(`bear_off:${pt}:${die}`);
            } else {
              // Can bear off with higher die if no checkers on higher home points
              let higherFound = false;
              for (let h = pt + 1; h <= 6; h++) {
                if (state.board[h].color === 'w' && state.board[h].count > 0) {
                  higherFound = true;
                  break;
                }
              }
              if (!higherFound) {
                moves.push(`bear_off:${pt}:${die}`);
              }
            }
          }
        }
      }
    }

    return moves;
  }

  function getLegalMovesForBlack(state, dice) {
    const moves = [];
    const diceSet = Array.from(new Set(dice));

    for (let d = 0; d < diceSet.length; d++) {
      const die = diceSet[d];

      if (state.blackBar > 0) {
        const targetPt = die;
        const targetCell = state.board[targetPt];
        if (!targetCell || targetCell.color !== 'w' || targetCell.count < 2) {
          moves.push(`enter:${die}`);
        }
        continue;
      }

      const canBear = canBlackBearOff(state);

      for (let pt = 1; pt <= 24; pt++) {
        const cell = state.board[pt];
        if (cell.color === 'b' && cell.count > 0) {
          const targetPt = pt + die;

          if (targetPt <= 24) {
            const destCell = state.board[targetPt];
            if (destCell.color !== 'w' || destCell.count < 2) {
              moves.push(`move:${pt}:${die}`);
            }
          } else if (canBear) {
            if (targetPt === 25) {
              moves.push(`bear_off:${pt}:${die}`);
            } else {
              let lowerFound = false;
              for (let l = 19; l < pt; l++) {
                if (state.board[l].color === 'b' && state.board[l].count > 0) {
                  lowerFound = true;
                  break;
                }
              }
              if (!lowerFound) {
                moves.push(`bear_off:${pt}:${die}`);
              }
            }
          }
        }
      }
    }

    return moves;
  }

  function isOver(state) {
    if (state.gameOver) return true;
    if (state.whiteOff >= 15 || state.blackOff >= 15) return true;
    if (state.stepCount >= MAX_STEPS) return true;
    return false;
  }

  function score(state) {
    return state.whiteOff * 10 - state.blackOff * 10;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const moves = getLegalMovesForWhite(state);
    if (moves.length > 0) {
      return moves;
    }

    return ['pass_dice'];
  }

  function applyMoveWhite(state, action) {
    let reward = 0;

    if (action.startsWith('enter:')) {
      const die = parseInt(action.split(':')[1], 10);
      const targetPt = 25 - die;
      state.whiteBar -= 1;

      const dest = state.board[targetPt];
      if (dest.color === 'b' && dest.count === 1) {
        state.blackBar += 1;
        dest.count = 1;
        dest.color = 'w';
        reward += 4;
        state.log.push(`White re-entered on point ${targetPt} and HIT Black blot!`);
      } else {
        dest.count += 1;
        dest.color = 'w';
        reward += 2;
        state.log.push(`White re-entered on point ${targetPt}.`);
      }
      consumeDie(state, die);
    } else if (action.startsWith('bear_off:')) {
      const parts = action.split(':');
      const fromPt = parseInt(parts[1], 10);
      const die = parseInt(parts[2], 10);

      const src = state.board[fromPt];
      src.count -= 1;
      if (src.count === 0) src.color = null;

      state.whiteOff += 1;
      reward += 5;
      state.log.push(`White bore off a checker from point ${fromPt}!`);
      consumeDie(state, die);
    } else if (action.startsWith('move:')) {
      const parts = action.split(':');
      const fromPt = parseInt(parts[1], 10);
      const die = parseInt(parts[2], 10);
      const toPt = fromPt - die;

      const src = state.board[fromPt];
      src.count -= 1;
      if (src.count === 0) src.color = null;

      const dest = state.board[toPt];
      if (dest.color === 'b' && dest.count === 1) {
        state.blackBar += 1;
        dest.count = 1;
        dest.color = 'w';
        reward += 4;
        state.log.push(`White moved ${fromPt} -> ${toPt} and HIT Black blot!`);
      } else {
        dest.count += 1;
        dest.color = 'w';
        reward += 1;
        state.log.push(`White moved ${fromPt} -> ${toPt}.`);
      }
      consumeDie(state, die);
    } else if (action === 'pass_dice') {
      state.currentDice = [];
      state.log.push('White could make no further moves with current dice.');
    }

    return reward;
  }

  function consumeDie(state, die) {
    const idx = state.currentDice.indexOf(die);
    if (idx !== -1) {
      state.currentDice.splice(idx, 1);
    }
  }

  function executeAiTurn(state) {
    if (isOver(state)) return;

    let aiDice = rollTwoDice(state);
    state.log.push(`Black rolled [${aiDice.join(', ')}].`);

    while (aiDice.length > 0) {
      const aiMoves = getLegalMovesForBlack(state, aiDice);
      if (aiMoves.length === 0) break;

      // Pick best move (prioritize bearing off, then hits, then furthest advance)
      let bestMove = aiMoves[0];
      for (let i = 0; i < aiMoves.length; i++) {
        const m = aiMoves[i];
        if (m.startsWith('bear_off:')) {
          bestMove = m;
          break;
        } else if (m.startsWith('move:')) {
          const parts = m.split(':');
          const toPt = parseInt(parts[1], 10) + parseInt(parts[2], 10);
          if (toPt <= 24 && state.board[toPt].color === 'w' && state.board[toPt].count === 1) {
            bestMove = m;
            break;
          }
        }
      }

      // Execute AI move
      if (bestMove.startsWith('enter:')) {
        const die = parseInt(bestMove.split(':')[1], 10);
        state.blackBar -= 1;
        const dest = state.board[die];
        if (dest.color === 'w' && dest.count === 1) {
          state.whiteBar += 1;
          dest.count = 1;
          dest.color = 'b';
          state.log.push(`Black re-entered on point ${die} and HIT White blot!`);
        } else {
          dest.count += 1;
          dest.color = 'b';
          state.log.push(`Black re-entered on point ${die}.`);
        }
        const dIdx = aiDice.indexOf(die);
        if (dIdx !== -1) aiDice.splice(dIdx, 1);
      } else if (bestMove.startsWith('bear_off:')) {
        const parts = bestMove.split(':');
        const fromPt = parseInt(parts[1], 10);
        const die = parseInt(parts[2], 10);
        const src = state.board[fromPt];
        src.count -= 1;
        if (src.count === 0) src.color = null;
        state.blackOff += 1;
        state.log.push(`Black bore off a checker from point ${fromPt}.`);
        const dIdx = aiDice.indexOf(die);
        if (dIdx !== -1) aiDice.splice(dIdx, 1);
      } else if (bestMove.startsWith('move:')) {
        const parts = bestMove.split(':');
        const fromPt = parseInt(parts[1], 10);
        const die = parseInt(parts[2], 10);
        const toPt = fromPt + die;
        const src = state.board[fromPt];
        src.count -= 1;
        if (src.count === 0) src.color = null;

        const dest = state.board[toPt];
        if (dest.color === 'w' && dest.count === 1) {
          state.whiteBar += 1;
          dest.count = 1;
          dest.color = 'b';
          state.log.push(`Black moved ${fromPt} -> ${toPt} and HIT White blot!`);
        } else {
          dest.count += 1;
          dest.color = 'b';
          state.log.push(`Black moved ${fromPt} -> ${toPt}.`);
        }
        const dIdx = aiDice.indexOf(die);
        if (dIdx !== -1) aiDice.splice(dIdx, 1);
      }
    }
  }

  function step(state, action) {
    if (!action || typeof action !== 'string') {
      throw new Error('Invalid action format: ' + action);
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    let reward = applyMoveWhite(state, action);

    // If White won immediately by bearing off 15
    if (state.whiteOff >= 15) {
      state.gameOver = true;
      state.winner = 'w';
      reward += 50;
      state.log.push('🏆 VICTORY! White bore off all 15 checkers!');
      return { reward, done: true };
    }

    // If White has used all dice or can make no more legal moves
    const nextWhiteMoves = getLegalMovesForWhite(state);
    if (state.currentDice.length === 0 || nextWhiteMoves.length === 0) {
      // AI counter-turn
      executeAiTurn(state);

      if (state.blackOff >= 15) {
        state.gameOver = true;
        state.winner = 'b';
        reward -= 30;
        state.log.push('💀 DEFEAT! Black bore off all 15 checkers.');
        return { reward, done: true };
      }

      // Roll new dice for White
      state.currentDice = rollTwoDice(state);
      state.lastRoll = state.currentDice.slice();
      state.log.push(`White rolled [${state.currentDice.join(', ')}].`);
    }

    state.stepCount += 1;
    if (state.stepCount >= MAX_STEPS && !state.gameOver) {
      state.gameOver = true;
      state.winner = state.whiteOff >= state.blackOff ? 'w' : 'b';
    }

    const done = isOver(state);
    return { reward, done };
  }

  const backgammonLogic = {
    MAX_STEPS,
    createState,
    legalActions,
    isOver,
    score,
    step,
    canWhiteBearOff,
    canBlackBearOff,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = backgammonLogic;
  } else {
    root.backgammonLogic = backgammonLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
