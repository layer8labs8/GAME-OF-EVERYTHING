(function (root) {
  const CAMPAIGN = [{"name":"Open Field","goal":"Clear the grid. 5 mines, no guessing needed","mines":[10,23,40,43,45],"first":8},{"name":"Safe Steps","goal":"Clear the grid. 5 mines, no guessing needed","mines":[11,21,24,36,46],"first":1},{"name":"Light Mines","goal":"Clear the grid. 6 mines, no guessing needed","mines":[8,9,20,25,26,33],"first":45},{"name":"Careful Path","goal":"Clear the grid. 6 mines, no guessing needed","mines":[5,15,26,28,35,41],"first":31},{"name":"Narrow Gaps","goal":"Clear the grid. 7 mines, no guessing needed","mines":[4,17,22,29,40,41,46],"first":13},{"name":"Tight Spots","goal":"Clear the grid. 7 mines, no guessing needed","mines":[19,23,24,27,38,44,48],"first":9},{"name":"Minefield","goal":"Clear the grid. 8 mines, no guessing needed","mines":[4,7,8,13,17,18,35,37],"first":32},{"name":"Deep Grid","goal":"Clear the grid. 8 mines, no guessing needed","mines":[12,16,36,37,38,41,45,47],"first":3},{"name":"Danger Zone","goal":"Clear the grid. 9 mines, no guessing needed","mines":[14,17,24,26,27,29,44,45,48],"first":12},{"name":"Full Alert","goal":"Clear the grid. 10 mines, no guessing needed","mines":[0,1,5,8,11,14,18,24,32,46],"first":43}];
  const SIZE = 7;
  const CELLS = SIZE * SIZE;
  const MINES = 7;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function neighbors(idx) {
    const r = Math.floor(idx / SIZE);
    const c = idx % SIZE;
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          out.push(nr * SIZE + nc);
        }
      }
    }
    return out;
  }

  function computeCounts(mines) {
    const counts = new Array(CELLS).fill(0);
    for (let i = 0; i < CELLS; i++) {
      if (!mines[i]) continue;
      const nb = neighbors(i);
      for (let k = 0; k < nb.length; k++) {
        counts[nb[k]] += 1;
      }
    }
    return counts;
  }

  function createState(seed, level) {
    const state = {
      mines: new Array(CELLS).fill(false),
      counts: new Array(CELLS).fill(0),
      revealed: new Array(CELLS).fill(false),
      revealedCount: 0,
      mineCount: level ? level.mines.length : MINES,
      points: 0,
      outcome: 'playing',
      explodedCell: -1,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };

    if (level) {
      for (const m of level.mines) state.mines[m] = true;
      state.counts = computeCounts(state.mines);
      step(state, level.first);
      state.points = 0;
      state.stepCount = 0;
      return state;
    }

    const indices = Array.from({ length: CELLS }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    for (let m = 0; m < MINES; m++) {
      state.mines[indices[m]] = true;
    }
    state.counts = computeCounts(state.mines);
    return state;
  }

  function isOver(state) {
    return state.outcome !== 'playing';
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    const actions = [];
    for (let i = 0; i < CELLS; i++) {
      if (!state.revealed[i]) actions.push(i);
    }
    return actions;
  }

  function step(state, action) {
    if (!Number.isInteger(action) || action < 0 || action >= CELLS || isOver(state) || state.revealed[action]) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;

    if (state.revealedCount === 0 && state.mines[action]) {
      state.mines[action] = false;
      for (let k = 1; k < CELLS; k++) {
        const dest = (action + k) % CELLS;
        if (!state.mines[dest]) {
          state.mines[dest] = true;
          break;
        }
      }
      state.counts = computeCounts(state.mines);
    }

    if (state.mines[action]) {
      state.revealed[action] = true;
      state.explodedCell = action;
      state.outcome = 'lost';
      return { reward: -25, done: true };
    }

    let newlyRevealed = 0;
    const queue = [action];
    state.revealed[action] = true;
    newlyRevealed += 1;

    while (queue.length > 0) {
      const cur = queue.shift();
      if (state.counts[cur] === 0) {
        const nb = neighbors(cur);
        for (let i = 0; i < nb.length; i++) {
          const nxt = nb[i];
          if (!state.revealed[nxt] && !state.mines[nxt]) {
            state.revealed[nxt] = true;
            newlyRevealed += 1;
            queue.push(nxt);
          }
        }
      }
    }

    state.revealedCount += newlyRevealed;
    let reward = newlyRevealed * 10;
    if (state.revealedCount === CELLS - state.mineCount) {
      state.outcome = 'won';
      reward += 100;
    }
    state.points += reward;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  function isWon(state) {
    return state.outcome === 'won';
  }

  const api = { CAMPAIGN, SIZE, CELLS, MINES, neighbors, computeCounts, createState, legalActions, step, isOver, isWon, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
