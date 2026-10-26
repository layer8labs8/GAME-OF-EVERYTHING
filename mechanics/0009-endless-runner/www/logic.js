(function (root) {
  const LANES = 3;
  const PLAYER_Y = 530;
  const JUMP_DURATION = 8;
  const SLIDE_DURATION = 8;
  const MAX_STEPS = 1500;
  const ACTIONS = ['left', 'right', 'jump', 'slide', 'wait'];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function createState(seed) {
    return {
      lane: 1,
      jumping: 0,
      sliding: 0,
      obstacles: [],
      shields: 3,
      distance: 0,
      points: 0,
      streak: 0,
      speed: 7,
      spawnTimer: 10,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
  }

  function isOver(state) {
    return Boolean(state.shields <= 0 || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ACTIONS.slice();
  }

  function step(state, action) {
    if (isOver(state) || typeof action !== 'string' || !ACTIONS.includes(action)) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    let reward = 0;

    // Process action
    if (action === 'left') {
      state.lane = Math.max(0, state.lane - 1);
    } else if (action === 'right') {
      state.lane = Math.min(LANES - 1, state.lane + 1);
    } else if (action === 'jump') {
      if (state.sliding === 0) {
        state.jumping = JUMP_DURATION;
      }
    } else if (action === 'slide') {
      if (state.jumping === 0) {
        state.sliding = SLIDE_DURATION;
      }
    }

    // Decrement jump / slide timers
    if (state.jumping > 0) state.jumping -= 1;
    if (state.sliding > 0) state.sliding -= 1;

    // Update speed & distance
    state.speed = Math.min(13, 7 + Math.floor(state.stepCount / 100) * 0.5);
    state.distance += state.speed;
    state.points += 2;
    reward += 2;

    // Advance obstacles
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const ob = state.obstacles[i];
      ob.y += state.speed;

      // Passed screen
      if (ob.y > 650) {
        state.obstacles.splice(i, 1);
        if (ob.type !== 'orb') {
          state.streak += 1;
          state.points += 5;
          reward += 5;
        }
      }
    }

    // Check collisions
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const ob = state.obstacles[i];
      if (ob.lane === state.lane && Math.abs(ob.y - PLAYER_Y) < 32) {
        if (ob.type === 'orb') {
          state.obstacles.splice(i, 1);
          state.points += 30;
          reward += 30;
        } else if (ob.type === 'hurdle') {
          state.obstacles.splice(i, 1);
          if (state.jumping > 0) {
            state.points += 15;
            reward += 15;
          } else {
            state.shields -= 1;
            state.streak = 0;
            reward -= 20;
          }
        } else if (ob.type === 'laser') {
          state.obstacles.splice(i, 1);
          if (state.sliding > 0) {
            state.points += 15;
            reward += 15;
          } else {
            state.shields -= 1;
            state.streak = 0;
            reward -= 20;
          }
        } else if (ob.type === 'barrier') {
          state.obstacles.splice(i, 1);
          state.shields -= 1;
          state.streak = 0;
          reward -= 20;
        }
      }
    }

    // Spawn new obstacles
    state.spawnTimer -= 1;
    if (state.spawnTimer <= 0) {
      const lane = Math.floor(nextRandom(state) * LANES);
      const roll = nextRandom(state);
      let type = 'hurdle';
      if (roll < 0.25) type = 'orb';
      else if (roll < 0.50) type = 'hurdle';
      else if (roll < 0.75) type = 'laser';
      else type = 'barrier';

      state.obstacles.push({ id: state.stepCount, lane, y: -40, type });
      state.spawnTimer = 12 + Math.floor(nextRandom(state) * 8);
    }

    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { LANES, PLAYER_Y, JUMP_DURATION, SLIDE_DURATION, MAX_STEPS, ACTIONS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
