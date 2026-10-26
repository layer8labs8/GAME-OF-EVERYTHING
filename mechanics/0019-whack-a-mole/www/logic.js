(function (root) {
  const MAX_STEPS = 120;
  const ACTIONS = ['wait', 0, 1, 2, 3, 4, 5, 6, 7, 8];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnCritters(state) {
    const emptyIdx = [];
    let active = 0;
    for (let i = 0; i < 9; i++) {
      if (state.holes[i].kind === 'empty') emptyIdx.push(i);
      else active += 1;
    }
    const chance = Math.min(0.75, 0.42 + state.stepCount * 0.003);
    if (emptyIdx.length > 0 && (active === 0 || nextRandom(state) < chance)) {
      const slot = emptyIdx[Math.floor(nextRandom(state) * emptyIdx.length)];
      const roll = nextRandom(state);
      const baseTtl = state.stepCount > 70 ? 3 : 4;
      if (roll < 0.16) state.holes[slot] = { kind: 'bomb', ttl: baseTtl };
      else if (roll < 0.32) state.holes[slot] = { kind: 'gold', ttl: Math.max(2, baseTtl - 1) };
      else state.holes[slot] = { kind: 'mole', ttl: baseTtl };
    }
  }

  function createState(seed) {
    const state = {
      holes: Array.from({ length: 9 }, () => ({ kind: 'empty', ttl: 0 })),
      points: 0,
      combo: 0,
      lives: 3,
      hits: 0,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    spawnCritters(state);
    return state;
  }

  function isOver(state) {
    return Boolean(state.lives <= 0 || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ACTIONS.slice();
  }

  function step(state, action) {
    if (isOver(state) || !ACTIONS.includes(action)) throw new Error('Illegal action');

    let reward = 0;
    if (typeof action === 'number') {
      const h = state.holes[action];
      if (h.kind === 'mole') {
        const gain = 10 + state.combo * 2;
        state.points += gain;
        state.combo += 1;
        state.hits += 1;
        reward += gain;
        state.holes[action] = { kind: 'empty', ttl: 0 };
      } else if (h.kind === 'gold') {
        const gain = 25 + state.combo * 2;
        state.points += gain;
        state.combo += 1;
        state.hits += 1;
        reward += gain;
        state.holes[action] = { kind: 'empty', ttl: 0 };
      } else if (h.kind === 'bomb') {
        state.points = Math.max(0, state.points - 15);
        state.lives -= 1;
        state.combo = 0;
        reward -= 15;
        state.holes[action] = { kind: 'empty', ttl: 0 };
      } else {
        state.combo = 0;
        reward -= 2;
      }
    }

    for (let i = 0; i < 9; i++) {
      const h = state.holes[i];
      if (h.kind !== 'empty') {
        h.ttl -= 1;
        if (h.ttl <= 0) {
          if (h.kind === 'mole' || h.kind === 'gold') state.combo = 0;
          state.holes[i] = { kind: 'empty', ttl: 0 };
        }
      }
    }

    state.stepCount += 1;
    if (!isOver(state)) spawnCritters(state);
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { MAX_STEPS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
