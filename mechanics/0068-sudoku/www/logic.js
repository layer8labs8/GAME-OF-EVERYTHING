(function (root) {
  const MAX_MISTAKES = 3;
  const MAX_STEPS = 80;
  const BASE = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function shuffle(arr, state) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function canUse(board, idx, val) {
    const r = Math.floor(idx / 4);
    const c = idx % 4;
    for (let k = 0; k < 4; k++) {
      if (board[r * 4 + k] === val) return false;
      if (board[k * 4 + c] === val) return false;
    }
    const br = Math.floor(r / 2) * 2;
    const bc = Math.floor(c / 2) * 2;
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 2; dc++) {
        if (board[(br + dr) * 4 + (bc + dc)] === val) return false;
      }
    }
    return true;
  }

  function countSolutions(board, limit) {
    const empty = board.indexOf(0);
    if (empty === -1) return 1;
    let total = 0;
    for (let d = 1; d <= 4; d++) {
      if (canUse(board, empty, d)) {
        board[empty] = d;
        total += countSolutions(board, limit - total);
        board[empty] = 0;
        if (total >= limit) return total;
      }
    }
    return total;
  }

  function makeSolvedGrid(state) {
    const map = shuffle([1, 2, 3, 4], state);
    let g = BASE.map((row) => row.map((v) => map[v - 1]));
    if (nextRandom(state) < 0.5) [g[0], g[1]] = [g[1], g[0]];
    if (nextRandom(state) < 0.5) [g[2], g[3]] = [g[3], g[2]];
    if (nextRandom(state) < 0.5) [g[0], g[1], g[2], g[3]] = [g[2], g[3], g[0], g[1]];

    const cols = [0, 1, 2, 3];
    if (nextRandom(state) < 0.5) [cols[0], cols[1]] = [cols[1], cols[0]];
    if (nextRandom(state) < 0.5) [cols[2], cols[3]] = [cols[3], cols[2]];
    if (nextRandom(state) < 0.5) [cols[0], cols[1], cols[2], cols[3]] = [cols[2], cols[3], cols[0], cols[1]];

    const out = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) out.push(g[r][cols[c]]);
    }
    return out;
  }

  function createState(seed) {
    const state = {
      board: [],
      given: [],
      solution: [],
      mistakes: 0,
      points: 0,
      solved: false,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    const sol = makeSolvedGrid(state);
    const puzzle = sol.slice();
    const order = shuffle(Array.from({ length: 16 }, (_, i) => i), state);
    let removed = 0;
    for (let i = 0; i < order.length && removed < 9; i++) {
      const idx = order[i];
      const saved = puzzle[idx];
      puzzle[idx] = 0;
      if (countSolutions(puzzle.slice(), 2) === 1) {
        removed += 1;
      } else {
        puzzle[idx] = saved;
      }
    }
    state.solution = sol;
    state.board = puzzle;
    state.given = puzzle.map((v) => v !== 0);
    return state;
  }

  function isOver(state) {
    return Boolean(state.solved || state.mistakes >= MAX_MISTAKES || state.stepCount >= MAX_STEPS || !state.board.includes(0));
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    const actions = [];
    for (let i = 0; i < 16; i++) {
      if (state.board[i] === 0) {
        for (let d = 1; d <= 4; d++) actions.push({ cell: i, digit: d });
      }
    }
    return actions;
  }

  function step(state, action) {
    if (!action || typeof action !== 'object') throw new Error('Illegal action');
    const legal = legalActions(state);
    const ok = legal.some((a) => a.cell === action.cell && a.digit === action.digit);
    if (!ok) throw new Error('Illegal action');

    state.stepCount += 1;
    let reward = 0;
    if (action.digit === state.solution[action.cell]) {
      state.board[action.cell] = action.digit;
      state.points += 15;
      reward = 15;
      if (!state.board.includes(0)) {
        state.solved = true;
        state.points += 80;
        reward += 80;
      }
    } else {
      state.mistakes += 1;
      state.points = Math.max(0, state.points - 5);
      reward = -10;
    }
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { MAX_MISTAKES, countSolutions, canUse, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
