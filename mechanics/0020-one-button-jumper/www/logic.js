(function (root) {
  const W = 320;
  const PLAYER_X = 64;
  const HALF_P = 10;
  const MAX_STEPS = 2000;
  const ACTIONS = ['run', 'jump'];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function addObstacle(state, startX) {
    const tall = nextRandom(state) < 0.4;
    const w = tall ? 18 : 24 + Math.floor(nextRandom(state) * 14);
    const h = tall ? 42 : 24 + Math.floor(nextRandom(state) * 10);
    state.obstacles.push({ x: startX, w, h, passed: false });
    state.spawnGap = 135 + Math.floor(nextRandom(state) * 85);
  }

  function createState(seed) {
    const state = {
      w: W,
      playerX: PLAYER_X,
      playerW: HALF_P * 2,
      y: 0,
      vy: 0,
      obstacles: [],
      spawnGap: 0,
      cleared: 0,
      points: 0,
      stepCount: 0,
      alive: true,
      rng: (seed >>> 0) || 1,
    };
    addObstacle(state, 240);
    return state;
  }

  function isOver(state) {
    return Boolean(!state.alive || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ACTIONS.slice();
  }

  function step(state, action) {
    if (isOver(state) || !ACTIONS.includes(action)) throw new Error('Illegal action');

    if (action === 'jump' && state.y === 0) {
      state.vy = 11.5;
    }

    const gravity = action === 'jump' && state.vy > 0 ? 0.65 : 1.15;
    state.y += state.vy;
    state.vy -= gravity;
    if (state.y <= 0) {
      state.y = 0;
      state.vy = 0;
    }

    const speed = 4.8 + Math.min(3.2, state.cleared * 0.12);
    state.spawnGap -= speed;
    if (state.spawnGap <= 0) {
      const rightMost = state.obstacles.length ? state.obstacles[state.obstacles.length - 1].x : W;
      addObstacle(state, Math.max(W + 10, rightMost + 135));
    }

    let reward = 1;
    for (let i = 0; i < state.obstacles.length; i++) {
      const ob = state.obstacles[i];
      ob.x -= speed;
      if (ob.x + ob.w > PLAYER_X - HALF_P && ob.x < PLAYER_X + HALF_P && state.y < ob.h) {
        state.alive = false;
        state.stepCount += 1;
        return { reward: -20, done: true };
      }
      if (!ob.passed && ob.x + ob.w < PLAYER_X - HALF_P) {
        ob.passed = true;
        state.cleared += 1;
        state.points += 10;
        reward += 10;
      }
    }

    state.obstacles = state.obstacles.filter((ob) => ob.x + ob.w > -20);
    state.points += 1;
    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { W, PLAYER_X, MAX_STEPS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
