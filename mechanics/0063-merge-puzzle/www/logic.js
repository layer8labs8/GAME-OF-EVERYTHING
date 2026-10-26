(function (root) {
  const N = 4;
  const MAX_STEPS = 1800;
  const ORDER = ['U', 'D', 'L', 'R'];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function slideLine(line) {
    const vals = line.filter((v) => v !== 0);
    const out = [];
    let gain = 0;
    for (let i = 0; i < vals.length; i++) {
      if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
        const merged = vals[i] * 2;
        out.push(merged);
        gain += merged;
        i += 1;
      } else {
        out.push(vals[i]);
      }
    }
    while (out.length < N) out.push(0);
    return { line: out, gain };
  }

  function simulateSlide(grid, dir) {
    const next = Array.from({ length: N }, () => Array(N).fill(0));
    let gain = 0;
    let changed = false;

    for (let i = 0; i < N; i++) {
      const line = [];
      for (let j = 0; j < N; j++) {
        if (dir === 'L') line.push(grid[i][j]);
        else if (dir === 'R') line.push(grid[i][N - 1 - j]);
        else if (dir === 'U') line.push(grid[j][i]);
        else line.push(grid[N - 1 - j][i]);
      }
      const res = slideLine(line);
      gain += res.gain;
      for (let j = 0; j < N; j++) {
        const v = res.line[j];
        if (dir === 'L') next[i][j] = v;
        else if (dir === 'R') next[i][N - 1 - j] = v;
        else if (dir === 'U') next[j][i] = v;
        else next[N - 1 - j][i] = v;
      }
    }

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (next[r][c] !== grid[r][c]) changed = true;
      }
    }
    return { grid: next, gain, changed };
  }

  function spawnTile(state) {
    const empty = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (state.grid[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(nextRandom(state) * empty.length)];
    const val = nextRandom(state) < 0.9 ? 2 : 4;
    state.grid[r][c] = val;
    if (val > state.maxTile) state.maxTile = val;
  }

  function updateMaxTile(state) {
    let m = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (state.grid[r][c] > m) m = state.grid[r][c];
      }
    }
    state.maxTile = m;
  }

  function createState(seed) {
    const state = {
      grid: Array.from({ length: N }, () => Array(N).fill(0)),
      points: 0,
      maxTile: 0,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    spawnTile(state);
    spawnTile(state);
    return state;
  }

  function validDirs(grid) {
    return ORDER.filter((d) => simulateSlide(grid, d).changed);
  }

  function isOver(state) {
    return Boolean(state.stepCount >= MAX_STEPS || validDirs(state.grid).length === 0);
  }

  function legalActions(state) {
    if (state.stepCount >= MAX_STEPS) return [];
    return validDirs(state.grid);
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action');

    const res = simulateSlide(state.grid, action);
    state.grid = res.grid;
    state.points += res.gain;
    state.stepCount += 1;
    spawnTile(state);
    updateMaxTile(state);
    return { reward: res.gain, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { N, MAX_STEPS, simulateSlide, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
