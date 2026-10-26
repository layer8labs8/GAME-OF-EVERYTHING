(function (root) {
  const LANES = 3;
  const PLAYER_Y = 530;
  const CAR_LEN = 46;
  const MAX_STEPS = 1500;
  const ACTIONS = ['left', 'right', 'nitro', 'wait'];

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
      traffic: [],
      items: [],
      hull: 3,
      distance: 0,
      points: 0,
      nitroActive: false,
      streak: 0,
      spawnCooldown: 0,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
  }

  function isOver(state) {
    return Boolean(state.hull <= 0 || state.stepCount >= MAX_STEPS);
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
      state.nitroActive = false;
    } else if (action === 'right') {
      state.lane = Math.min(LANES - 1, state.lane + 1);
      state.nitroActive = false;
    } else if (action === 'nitro') {
      state.nitroActive = true;
    } else {
      state.nitroActive = false;
    }

    const speed = state.nitroActive ? 14 : 7;
    state.distance += speed;
    const tickGain = state.nitroActive ? 4 : 2;
    state.points += tickGain;
    reward += tickGain;

    // Advance traffic
    for (let i = state.traffic.length - 1; i >= 0; i--) {
      const c = state.traffic[i];
      c.y += speed - c.speed;
      if (c.y > 660) {
        state.traffic.splice(i, 1);
        state.streak += 1;
      }
    }

    // Advance items
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += speed;
      if (it.y > 660) {
        state.items.splice(i, 1);
      }
    }

    // Check collisions with traffic
    for (let i = state.traffic.length - 1; i >= 0; i--) {
      const c = state.traffic[i];
      if (c.lane === state.lane && Math.abs(c.y - PLAYER_Y) < CAR_LEN) {
        state.traffic.splice(i, 1);
        state.hull -= 1;
        state.streak = 0;
        reward -= 25;
      }
    }

    // Check item pickups
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      if (it.lane === state.lane && Math.abs(it.y - PLAYER_Y) < CAR_LEN) {
        state.items.splice(i, 1);
        state.hull = Math.min(3, state.hull + 1);
        state.points += 40;
        reward += 40;
      }
    }

    // Spawn new obstacles / items
    state.spawnCooldown -= 1;
    if (state.spawnCooldown <= 0) {
      const lane = Math.floor(nextRandom(state) * LANES);
      const isItem = nextRandom(state) < 0.25;

      if (isItem) {
        state.items.push({ id: state.stepCount, lane, y: -40, type: 'fuel' });
      } else {
        const rivalSpeed = 2 + Math.floor(nextRandom(state) * 3);
        state.traffic.push({ id: state.stepCount, lane, y: -50, speed: rivalSpeed, type: Math.floor(nextRandom(state) * 3) });
      }
      state.spawnCooldown = 12 + Math.floor(nextRandom(state) * 10);
    }

    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { LANES, PLAYER_Y, CAR_LEN, MAX_STEPS, ACTIONS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
