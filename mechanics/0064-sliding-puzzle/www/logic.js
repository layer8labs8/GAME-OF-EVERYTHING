(function (root) {
  const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const MAX_STEPS = 220;
  const DIRECTIONS = ['U', 'D', 'L', 'R'];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function neighbours(idx) {
    const r = Math.floor(idx / 3);
    const c = idx % 3;
    const list = [];
    if (r > 0) list.push((r - 1) * 3 + c);
    if (r < 2) list.push((r + 1) * 3 + c);
    if (c > 0) list.push(r * 3 + (c - 1));
    if (c < 2) list.push(r * 3 + (c + 1));
    return list.sort((a, b) => a - b);
  }

  function checkSolved(tiles) {
    for (let i = 0; i < 9; i++) if (tiles[i] !== GOAL[i]) return false;
    return true;
  }

  function countInPlace(tiles) {
    let n = 0;
    for (let i = 0; i < 8; i++) if (tiles[i] === i + 1) n += 1;
    return n;
  }

  function inversions(tiles) {
    const arr = tiles.filter((v) => v !== 0);
    let inv = 0;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] > arr[j]) inv += 1;
      }
    }
    return inv;
  }

  function moveGap(tiles, dir) {
    const gap = tiles.indexOf(0);
    if (gap === -1) return tiles.slice();
    const r = Math.floor(gap / 3);
    const c = gap % 3;
    let target = -1;
    if (dir === 'U' && r > 0) target = gap - 3;
    if (dir === 'D' && r < 2) target = gap + 3;
    if (dir === 'L' && c > 0) target = gap - 1;
    if (dir === 'R' && c < 2) target = gap + 1;
    if (target === -1) return tiles.slice();
    const next = tiles.slice();
    next[gap] = next[target];
    next[target] = 0;
    return next;
  }

  function play(tiles, moves) {
    let current = tiles.slice();
    for (const m of moves) {
      current = moveGap(current, m);
    }
    return current;
  }

  function createState(seed, initialTiles) {
    const state = {
      tiles: Array.isArray(initialTiles) && initialTiles.length === 9 ? initialTiles.slice() : GOAL.slice(),
      stepCount: 0,
      solved: false,
      rng: (seed >>> 0) || 1,
    };
    if (Array.isArray(initialTiles) && initialTiles.length === 9) {
      state.solved = checkSolved(state.tiles);
      return state;
    }
    let prevGap = -1;
    for (let k = 0; k < 44; k++) {
      const gap = state.tiles.indexOf(0);
      const opts = neighbours(gap).filter((idx) => idx !== prevGap);
      const pick = opts[Math.floor(nextRandom(state) * opts.length)];
      state.tiles[gap] = state.tiles[pick];
      state.tiles[pick] = 0;
      prevGap = gap;
    }
    if (checkSolved(state.tiles)) {
      const gap = state.tiles.indexOf(0);
      const pick = neighbours(gap)[0];
      state.tiles[gap] = state.tiles[pick];
      state.tiles[pick] = 0;
    }
    return state;
  }

  function isOver(state) {
    return Boolean(state.solved || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    return neighbours(state.tiles.indexOf(0));
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action');

    const before = countInPlace(state.tiles);
    const gap = state.tiles.indexOf(0);
    state.tiles[gap] = state.tiles[action];
    state.tiles[action] = 0;
    state.stepCount += 1;
    state.solved = checkSolved(state.tiles);

    const after = countInPlace(state.tiles);
    let reward = (after - before) * 5 - 1;
    if (state.solved) reward += 100;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    if (state.solved) return Math.max(20, 200 - state.stepCount * 2);
    return countInPlace(state.tiles) * 10;
  }

  const api = {
    GOAL,
    MAX_STEPS,
    DIRECTIONS,
    inversions,
    moveGap,
    play,
    isSolved: checkSolved,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
