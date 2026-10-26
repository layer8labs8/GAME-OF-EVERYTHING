(function (root) {
  const MAX_LOCKS = 25;
  const MAX_IDLE = 160;
  const MAX_STEPS = 1800;
  const ACTIONS = ['wait', 'tap'];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextTarget(state) {
    state.target = Math.round(20 + nextRandom(state) * 60);
    state.goodRadius = Math.max(7, 15 - state.locks * 0.3);
    state.perfectRadius = Math.max(2.5, state.goodRadius * 0.38);
    state.speed = Math.min(3.8, 1.45 + state.locks * 0.09);
    state.idleTicks = 0;
  }

  function createState(seed) {
    const state = {
      pos: 10,
      dir: 1,
      speed: 1.45,
      target: 50,
      goodRadius: 15,
      perfectRadius: 5.7,
      locks: 0,
      streak: 0,
      lives: 3,
      idleTicks: 0,
      points: 0,
      lastGrade: 'none',
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    nextTarget(state);
    return state;
  }

  function isOver(state) {
    return Boolean(state.lives <= 0 || state.locks >= MAX_LOCKS || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ACTIONS.slice();
  }

  function step(state, action) {
    if (isOver(state) || !ACTIONS.includes(action)) throw new Error('Illegal action');

    let reward = 0;
    if (action === 'tap') {
      const dist = Math.abs(state.pos - state.target);
      state.idleTicks = 0;
      if (dist <= state.perfectRadius) {
        const gain = 25 + state.streak * 5;
        state.points += gain;
        state.streak += 1;
        state.locks += 1;
        state.lastGrade = 'perfect';
        reward += gain;
        if (state.locks >= MAX_LOCKS) {
          state.points += 100;
          reward += 100;
        } else {
          state.dir = -state.dir;
          nextTarget(state);
        }
      } else if (dist <= state.goodRadius) {
        const gain = 10 + state.streak * 2;
        state.points += gain;
        state.streak += 1;
        state.locks += 1;
        state.lastGrade = 'good';
        reward += gain;
        if (state.locks >= MAX_LOCKS) {
          state.points += 100;
          reward += 100;
        } else {
          state.dir = -state.dir;
          nextTarget(state);
        }
      } else {
        state.lives -= 1;
        state.streak = 0;
        state.lastGrade = 'miss';
        reward -= 10;
      }
    } else {
      state.pos += state.dir * state.speed;
      if (state.pos >= 100) {
        state.pos = 200 - state.pos;
        state.dir = -1;
      } else if (state.pos <= 0) {
        state.pos = -state.pos;
        state.dir = 1;
      }
      state.idleTicks += 1;
      if (state.idleTicks >= MAX_IDLE) {
        state.idleTicks = 0;
        state.lives -= 1;
        state.streak = 0;
        state.lastGrade = 'miss';
        reward -= 10;
      }
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { MAX_LOCKS, MAX_IDLE, MAX_STEPS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
