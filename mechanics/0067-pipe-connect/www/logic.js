(function (root) {
  const SIZE = 5;
  const MAX_MOVES = 55;
  // Bitmasks: N=1, E=2, S=4, W=8
  const DIRS = [
    { dr: -1, dc: 0, bit: 1, opp: 4 },
    { dr: 0, dc: 1, bit: 2, opp: 8 },
    { dr: 1, dc: 0, bit: 4, opp: 1 },
    { dr: 0, dc: -1, bit: 8, opp: 2 },
  ];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function rotCW(mask) {
    return ((mask << 1) | (mask >> 3)) & 15;
  }

  function computeWet(pipes) {
    const wet = Array(SIZE * SIZE).fill(false);
    if (!pipes || pipes[0] === 0) return wet;
    wet[0] = true;
    const queue = [0];
    while (queue.length > 0) {
      const idx = queue.shift();
      const r = Math.floor(idx / SIZE);
      const c = idx % SIZE;
      const m = pipes[idx];
      for (let k = 0; k < 4; k++) {
        const d = DIRS[k];
        if ((m & d.bit) === 0) continue;
        const nr = r + d.dr;
        const nc = c + d.dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        const nIdx = nr * SIZE + nc;
        if (!wet[nIdx] && (pipes[nIdx] & d.opp) !== 0) {
          wet[nIdx] = true;
          queue.push(nIdx);
        }
      }
    }
    return wet;
  }

  function buildNetwork(state) {
    const pipes = Array(SIZE * SIZE).fill(0);
    const seen = Array(SIZE * SIZE).fill(false);
    const path = [];

    function dfs(idx) {
      seen[idx] = true;
      path.push(idx);
      if (idx === SIZE * SIZE - 1) return true;
      const r = Math.floor(idx / SIZE);
      const c = idx % SIZE;
      const order = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) {
        const j = Math.floor(nextRandom(state) * (i + 1));
        const tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
      }
      for (let i = 0; i < 4; i++) {
        const d = DIRS[order[i]];
        const nr = r + d.dr;
        const nc = c + d.dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        const nIdx = nr * SIZE + nc;
        if (!seen[nIdx] && dfs(nIdx)) {
          pipes[idx] |= d.bit;
          pipes[nIdx] |= d.opp;
          return true;
        }
      }
      path.pop();
      return false;
    }

    dfs(0);

    for (let b = 0; b < 6; b++) {
      const base = path[Math.floor(nextRandom(state) * path.length)];
      const r = Math.floor(base / SIZE);
      const c = base % SIZE;
      const d = DIRS[Math.floor(nextRandom(state) * 4)];
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        const nIdx = nr * SIZE + nc;
        if (pipes[nIdx] === 0) {
          pipes[base] |= d.bit;
          pipes[nIdx] |= d.opp;
        }
      }
    }

    for (let i = 0; i < pipes.length; i++) {
      if (pipes[i] !== 0 && pipes[i] !== 15) {
        const turns = 1 + Math.floor(nextRandom(state) * 3);
        for (let t = 0; t < turns; t++) pipes[i] = rotCW(pipes[i]);
      }
    }
    if (computeWet(pipes)[SIZE * SIZE - 1]) {
      pipes[0] = rotCW(pipes[0]);
    }
    return pipes;
  }

  function play(pipes, moves) {
    const p = pipes.slice();
    for (const ch of moves) {
      const idx = ch.charCodeAt(0) - 97;
      if (idx >= 0 && idx < SIZE * SIZE) {
        p[idx] = rotCW(p[idx]);
      }
    }
    return p;
  }

  function isSolved(pipes) {
    return Boolean(computeWet(pipes)[SIZE * SIZE - 1]);
  }

  function createState(seed, initialPipes) {
    const state = {
      size: SIZE,
      pipes: Array.isArray(initialPipes) && initialPipes.length === SIZE * SIZE ? initialPipes.slice() : [],
      wet: [],
      movesLeft: MAX_MOVES,
      stepCount: 0,
      connected: false,
      rng: (seed >>> 0) || 1,
    };
    if (!Array.isArray(initialPipes) || initialPipes.length !== SIZE * SIZE) {
      state.pipes = buildNetwork(state);
    }
    state.wet = computeWet(state.pipes);
    state.connected = state.wet[SIZE * SIZE - 1];
    return state;
  }

  function rotatableIndices(pipes) {
    const out = [];
    for (let i = 0; i < pipes.length; i++) {
      if (pipes[i] !== 0 && pipes[i] !== 15) out.push(i);
    }
    return out;
  }

  function isOver(state) {
    return Boolean(state.connected || state.movesLeft <= 0 || rotatableIndices(state.pipes).length === 0);
  }

  function legalActions(state) {
    if (state.connected || state.movesLeft <= 0) return [];
    return rotatableIndices(state.pipes);
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action');

    const beforeWet = state.wet.filter(Boolean).length;
    state.pipes[action] = rotCW(state.pipes[action]);
    state.movesLeft -= 1;
    state.stepCount += 1;
    state.wet = computeWet(state.pipes);
    state.connected = state.wet[SIZE * SIZE - 1];
    const afterWet = state.wet.filter(Boolean).length;

    let reward = (afterWet - beforeWet) * 2 - 1;
    if (state.connected) reward += 100;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    if (state.connected) return 100 + state.movesLeft * 3;
    return state.wet.filter(Boolean).length * 4;
  }

  const api = {
    SIZE,
    MAX_MOVES,
    rotCW,
    computeWet,
    createState,
    legalActions,
    step,
    isOver,
    score,
    play,
    isSolved,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
