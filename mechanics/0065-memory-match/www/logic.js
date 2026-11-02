(function (root) {
  const CAMPAIGN = [{"name":"First Look","goal":"Find all 8 pairs in 20 turns","deck":[1,5,3,6,1,7,2,6,4,2,0,5,4,3,7,0],"turns":20},{"name":"Warm Up","goal":"Find all 8 pairs in 19 turns","deck":[6,0,2,0,7,4,1,4,1,3,5,5,7,6,2,3],"turns":19},{"name":"Quick Eyes","goal":"Find all 8 pairs in 18 turns","deck":[4,6,0,7,5,2,4,1,3,7,5,6,1,3,0,2],"turns":18},{"name":"Steady Hands","goal":"Find all 8 pairs in 17 turns","deck":[0,4,5,2,7,0,7,3,6,3,1,4,2,5,6,1],"turns":17},{"name":"Sharp Mind","goal":"Find all 8 pairs in 16 turns","deck":[2,5,2,4,1,0,6,7,3,7,1,4,0,5,6,3],"turns":16},{"name":"No Waste","goal":"Find all 8 pairs in 15 turns","deck":[6,0,1,7,0,7,4,3,5,3,4,2,5,6,2,1],"turns":15},{"name":"Close Call","goal":"Find all 8 pairs in 14 turns","deck":[0,3,2,1,4,5,7,2,6,1,6,5,3,0,7,4],"turns":14},{"name":"Tight Turns","goal":"Find all 8 pairs in 13 turns","deck":[6,4,3,0,2,7,2,7,1,4,1,3,6,5,0,5],"turns":13},{"name":"Perfect Recall","goal":"Find all 8 pairs in 12 turns","deck":[0,1,7,3,4,2,7,6,4,5,1,6,5,3,0,2],"turns":12},{"name":"Memory Master","goal":"Find all 8 pairs in 11 turns","deck":[5,7,1,0,5,3,0,7,4,1,2,2,6,3,4,6],"turns":11}];
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

  function createState(seed, level) {
    const rng = createRNG(seed);
    const symbols = [];
    for (let v = 0; v < 8; v++) {
      symbols.push(v, v);
    }
    for (let i = symbols.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
    }
    const deck = level ? level.deck : symbols;
    const grid = deck.map((symbol) => ({
      symbol,
      faceUp: false,
      matched: false,
    }));
    return {
      grid,
      turnsLeft: level ? level.turns : 20,
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

  function isWon(state) {
    return state.grid.every((card) => card.matched);
  }

  const api = { CAMPAIGN, createState, legalActions, step, isOver, isWon, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
