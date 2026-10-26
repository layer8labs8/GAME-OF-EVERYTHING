(function (root) {
  // mulberry32 PRNG
  function createRNG(seed) {
    let state = (seed >>> 0) || 1;
    return {
      next() {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      getState() { return state; },
    };
  }

  function createState(seed) {
    const rng = createRNG(seed);
    const symbols = [];
    for (let v = 0; v < 8; v++) {
      symbols.push(v, v);
    }
    for (let i = symbols.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
    }
    const grid = symbols.map((symbol) => ({
      symbol,
      faceUp: false,
      matched: false,
    }));
    return {
      grid,
      turnsLeft: 20,
      firstFlip: null,
      stepCount: 0,
      rng: rng.getState(),
    };
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    const actions = [];
    for (let i = 0; i < 16; i++) {
      const card = state.grid[i];
      if (!card.faceUp && !card.matched) {
        if (state.firstFlip === null || i !== state.firstFlip) {
          actions.push(i);
        }
      }
    }
    return actions;
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (legal.indexOf(action) === -1) {
      throw new Error('Illegal action');
    }
    state.stepCount++;
    let reward = 0;
    if (state.firstFlip === null) {
      state.grid[action].faceUp = true;
      state.firstFlip = action;
    } else {
      const i = state.firstFlip;
      const j = action;
      state.grid[j].faceUp = true;
      if (state.grid[i].symbol === state.grid[j].symbol) {
        state.grid[i].matched = true;
        state.grid[j].matched = true;
        reward = 10;
      } else {
        state.grid[i].faceUp = false;
        state.grid[j].faceUp = false;
        reward = -1;
      }
      state.turnsLeft--;
      state.firstFlip = null;
    }
    const allMatched = state.grid.every((card) => card.matched);
    let done = false;
    if (allMatched) {
      done = true;
      reward += 50;
    } else if (state.turnsLeft === 0) {
      done = true;
    } else if (state.stepCount >= 400) {
      done = true;
    }
    return { reward, done };
  }

  function isOver(state) {
    const allMatched = state.grid.every((card) => card.matched);
    return allMatched || state.turnsLeft === 0 || state.stepCount >= 400;
  }

  function score(state) {
    const matchedPairs = state.grid.filter((card) => card.matched).length / 2;
    const base = matchedPairs * 10;
    const bonus = matchedPairs === 8 ? 50 : 0;
    return base + bonus;
  }

  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
