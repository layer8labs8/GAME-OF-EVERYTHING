(function (root) {
  const CAMPAIGN = [{"name":"First Sparks","goal":"Score 1580 in 20 moves","board":[5,2,2,1,2,3,4,3,2,1,1,3,5,4,3,3,4,5,1,4,3,5,1,5,2,5,4,5,2,1,5,4,4,3,2,2],"rng":2000,"moves":20,"target":1580},{"name":"Bright Start","goal":"Score 1620 in 20 moves","board":[1,3,3,4,1,5,1,3,1,1,5,2,4,4,2,1,5,4,2,4,3,5,2,1,2,2,4,3,5,5,3,5,1,5,4,4],"rng":2001,"moves":20,"target":1620},{"name":"Gem Rush","goal":"Score 2090 in 18 moves","board":[2,5,5,2,5,5,1,4,4,1,5,3,3,5,1,2,4,1,4,4,5,2,2,3,3,1,1,3,4,2,1,4,2,2,4,2],"rng":2002,"moves":18,"target":2090},{"name":"Chain Reaction","goal":"Score 1920 in 18 moves","board":[2,5,1,3,1,3,4,3,2,4,1,1,1,3,2,2,5,1,1,4,3,2,4,3,4,5,3,3,4,1,4,5,5,1,1,2],"rng":2003,"moves":18,"target":1920},{"name":"Crystal Run","goal":"Score 1720 in 16 moves","board":[2,4,5,4,4,1,4,1,5,2,2,4,5,4,1,3,4,2,2,5,5,1,3,5,5,2,4,2,2,4,2,4,2,1,4,2],"rng":2004,"moves":16,"target":1720},{"name":"Short Fuse","goal":"Score 2170 in 16 moves","board":[3,2,5,1,4,2,1,4,5,2,2,4,3,3,4,1,5,1,3,2,3,2,5,5,5,3,5,1,4,5,3,4,4,2,1,4],"rng":2005,"moves":16,"target":2170},{"name":"Deep Cuts","goal":"Score 1750 in 15 moves","board":[1,4,1,1,5,5,5,3,5,2,4,4,1,5,4,4,3,1,5,3,5,5,1,3,2,1,4,3,3,1,1,5,3,5,4,3],"rng":2006,"moves":15,"target":1750},{"name":"Prism Push","goal":"Score 1920 in 14 moves","board":[1,3,2,1,2,3,2,3,5,2,2,3,4,5,4,1,4,4,3,2,1,3,4,3,5,3,3,2,3,4,5,2,1,3,3,1],"rng":2007,"moves":14,"target":1920},{"name":"High Stakes","goal":"Score 1770 in 13 moves","board":[2,4,1,1,2,3,4,3,1,2,4,5,5,3,3,2,5,4,4,5,4,4,3,5,4,2,5,5,1,4,2,4,5,3,1,4],"rng":2008,"moves":13,"target":1770},{"name":"Final Cascade","goal":"Score 1560 in 12 moves","board":[1,1,5,5,3,3,2,3,3,2,2,1,2,4,4,1,1,4,1,3,3,2,1,3,2,5,2,4,4,3,3,2,1,2,2,1],"rng":2009,"moves":12,"target":1560}];
  const SIZE = 6;
  const CELLS = SIZE * SIZE;
  const GEM_TYPES = 5;
  const START_MOVES = 25;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function rollGem(state) {
    return 1 + Math.floor(nextRandom(state) * GEM_TYPES);
  }

  function findMatches(board) {
    const matched = new Array(CELLS).fill(false);
    let count = 0;

    // Horizontal check
    for (let r = 0; r < SIZE; r++) {
      let runLen = 1;
      for (let c = 1; c <= SIZE; c++) {
        const prev = c > 0 ? board[r * SIZE + (c - 1)] : 0;
        const cur = c < SIZE ? board[r * SIZE + c] : 0;
        if (c < SIZE && cur !== 0 && cur === prev) {
          runLen++;
        } else {
          if (runLen >= 3 && prev !== 0) {
            for (let k = 1; k <= runLen; k++) {
              const idx = r * SIZE + (c - k);
              if (!matched[idx]) {
                matched[idx] = true;
                count++;
              }
            }
          }
          runLen = 1;
        }
      }
    }

    // Vertical check
    for (let c = 0; c < SIZE; c++) {
      let runLen = 1;
      for (let r = 1; r <= SIZE; r++) {
        const prev = r > 0 ? board[(r - 1) * SIZE + c] : 0;
        const cur = r < SIZE ? board[r * SIZE + c] : 0;
        if (r < SIZE && cur !== 0 && cur === prev) {
          runLen++;
        } else {
          if (runLen >= 3 && prev !== 0) {
            for (let k = 1; k <= runLen; k++) {
              const idx = (r - k) * SIZE + c;
              if (!matched[idx]) {
                matched[idx] = true;
                count++;
              }
            }
          }
          runLen = 1;
        }
      }
    }

    if (count === 0) return [];
    const result = [];
    for (let i = 0; i < CELLS; i++) {
      if (matched[i]) result.push(i);
    }
    return result;
  }

  function applyGravity(board, state) {
    for (let c = 0; c < SIZE; c++) {
      let writeRow = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        const idx = r * SIZE + c;
        if (board[idx] !== 0) {
          if (writeRow !== r) {
            board[writeRow * SIZE + c] = board[idx];
            board[idx] = 0;
          }
          writeRow--;
        }
      }
      while (writeRow >= 0) {
        board[writeRow * SIZE + c] = rollGem(state);
        writeRow--;
      }
    }
  }

  function canSwap(board, idx1, idx2) {
    const val1 = board[idx1];
    const val2 = board[idx2];
    if (val1 === val2) return false;

    board[idx1] = val2;
    board[idx2] = val1;
    const matches = findMatches(board);
    board[idx1] = val1;
    board[idx2] = val2;

    return matches.length > 0;
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    const actions = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const idx = r * SIZE + c;
        if (c < SIZE - 1 && canSwap(state.board, idx, idx + 1)) {
          actions.push({ cell: idx, dir: 'right' });
        }
        if (r < SIZE - 1 && canSwap(state.board, idx, idx + SIZE)) {
          actions.push({ cell: idx, dir: 'down' });
        }
      }
    }
    return actions;
  }

  function createState(seed, level) {
    const state = {
      board: new Array(CELLS).fill(0),
      movesLeft: level ? level.moves : START_MOVES,
      target: level ? level.target : 0,
      points: 0,
      lastCleared: 0,
      lastCombo: 0,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };

    if (level) {
      state.board = level.board.slice();
      state.rng = level.rng;
      return state;
    }

    let attempts = 0;
    while (attempts < 50) {
      for (let i = 0; i < CELLS; i++) {
        state.board[i] = rollGem(state);
      }
      let matches = findMatches(state.board);
      while (matches.length > 0) {
        for (let k = 0; k < matches.length; k++) {
          state.board[matches[k]] = rollGem(state);
        }
        matches = findMatches(state.board);
      }
      if (legalActions(state).length > 0) break;
      attempts++;
    }

    return state;
  }

  function isWon(state) {
    return state.target > 0 && state.points >= state.target;
  }

  function isOver(state) {
    return state.movesLeft <= 0 || isWon(state);
  }

  function step(state, action) {
    if (!action || typeof action !== 'object') throw new Error('Illegal action');
    const { cell, dir } = action;
    if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS || (dir !== 'right' && dir !== 'down')) {
      throw new Error('Illegal action');
    }

    const r = Math.floor(cell / SIZE);
    const c = cell % SIZE;
    const targetIdx = dir === 'right' ? (c < SIZE - 1 ? cell + 1 : -1) : (r < SIZE - 1 ? cell + SIZE : -1);
    if (targetIdx === -1) throw new Error('Illegal action');

    if (!canSwap(state.board, cell, targetIdx)) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    state.movesLeft -= 1;

    // Execute swap
    const tmp = state.board[cell];
    state.board[cell] = state.board[targetIdx];
    state.board[targetIdx] = tmp;

    // Resolve cascades
    let combo = 0;
    let totalCleared = 0;
    let turnPoints = 0;

    let matches = findMatches(state.board);
    while (matches.length > 0) {
      combo += 1;
      totalCleared += matches.length;
      let matchPoints = matches.length * 10;
      if (matches.length >= 4) matchPoints += 20;
      if (matches.length >= 5) matchPoints += 40;
      turnPoints += matchPoints * combo;

      for (let i = 0; i < matches.length; i++) {
        state.board[matches[i]] = 0;
      }
      applyGravity(state.board, state);
      matches = findMatches(state.board);
    }

    state.points += turnPoints;
    state.lastCleared = totalCleared;
    state.lastCombo = combo;

    return { reward: turnPoints, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { CAMPAIGN, SIZE, CELLS, GEM_TYPES, START_MOVES, findMatches, createState, legalActions, step, isOver, isWon, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
