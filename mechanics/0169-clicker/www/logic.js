(function (root) {
  const MAX_TURNS = 150;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function upgradeCost(kind, state) {
    if (kind === 'up_tap') return Math.floor(12 * Math.pow(1.65, state.tapLevel));
    if (kind === 'up_auto') return Math.floor(18 * Math.pow(1.65, state.autoLevel));
    if (kind === 'up_mult') return Math.floor(55 * Math.pow(2.1, state.multLevel));
    return Infinity;
  }

  function tapPower(state) {
    return (1 + state.tapLevel * 2) * (1 + state.multLevel);
  }

  function autoRate(state) {
    return state.autoLevel * 2 * (1 + state.multLevel);
  }

  function createState(seed) {
    return {
      coins: 0,
      totalMinted: 0,
      tapLevel: 0,
      autoLevel: 0,
      multLevel: 0,
      lastCrit: false,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
  }

  function isOver(state) {
    return state.stepCount >= MAX_TURNS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    const acts = ['tap'];
    if (state.autoLevel > 0) acts.push('tick');
    if (state.coins >= upgradeCost('up_tap', state)) acts.push('up_tap');
    if (state.coins >= upgradeCost('up_auto', state)) acts.push('up_auto');
    if (state.coins >= upgradeCost('up_mult', state)) acts.push('up_mult');
    return acts;
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    let minted = 0;

    if (action === 'tap') {
      const crit = nextRandom(state) < 0.12;
      state.lastCrit = crit;
      const strike = tapPower(state) * (crit ? 2 : 1);
      minted = strike + autoRate(state);
    } else if (action === 'tick') {
      state.lastCrit = false;
      minted = autoRate(state);
    } else {
      const cost = upgradeCost(action, state);
      state.coins -= cost;
      if (action === 'up_tap') state.tapLevel += 1;
      else if (action === 'up_auto') state.autoLevel += 1;
      else if (action === 'up_mult') state.multLevel += 1;
      state.lastCrit = false;
      minted = autoRate(state);
    }

    state.coins += minted;
    state.totalMinted += minted;
    return { reward: minted, done: isOver(state) };
  }

  function score(state) {
    return state.totalMinted;
  }

  const api = { MAX_TURNS, upgradeCost, tapPower, autoRate, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
