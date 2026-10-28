// Rooftop Velocity - Parkour deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RooftopVelocity = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TARGET_DISTANCE = 1000;
  const MAX_STEPS = 160;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnInitialObstacles(state) {
    const obstacles = [];
    let curDist = 40;
    let idGen = 1;

    while (curDist < TARGET_DISTANCE + 100) {
      const roll = nextRandom(state);
      let type = 'gap';
      if (roll < 0.3) type = 'gap';
      else if (roll < 0.6) type = 'duct';
      else if (roll < 0.85) type = 'barrier';
      else type = 'ring';

      obstacles.push({
        id: `obs_${idGen++}`,
        type,
        distance: curDist
      });

      curDist += 30 + Math.floor(nextRandom(state) * 25);
    }
    return obstacles;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      distance: 0,
      momentum: 50,
      shields: 3,
      maxShields: 3,
      streak: 0,
      scoreVal: 0,
      won: false,
      lost: false,
      obstacles: []
    };

    state.obstacles = spawnInitialObstacles(state);
    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.shields <= 0 || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = ['run', 'jump', 'slide', 'wall_run'];
    if (state.momentum >= 25) {
      actions.push('boost');
    }
    return actions;
  }

  function score(state) {
    return state.scoreVal;
  }

  function step(state, action) {
    if (isOver(state)) {
      throw new Error('Game is over; no actions allowed');
    }
    const legals = legalActions(state);
    if (!legals.includes(action)) {
      throw new Error(`Illegal action "${action}"`);
    }

    const prevScore = state.scoreVal;
    state.stepCount++;

    // Calculate advance speed
    let stepDist = 12 + Math.floor(state.momentum / 8);
    if (action === 'boost') {
      state.momentum -= 25;
      stepDist *= 2;
    }

    const oldDist = state.distance;
    state.distance = Math.min(TARGET_DISTANCE, state.distance + stepDist);
    state.scoreVal += stepDist * (1 + Math.floor(state.streak / 3));

    // Check obstacles traversed during this advance step
    for (const obs of state.obstacles) {
      if (obs.distance > oldDist && obs.distance <= state.distance) {
        if (obs.type === 'ring') {
          // Collectible token
          state.momentum = Math.min(100, state.momentum + 20);
          state.scoreVal += 100;
        } else {
          let success = false;
          if (obs.type === 'gap' && action === 'jump') success = true;
          else if (obs.type === 'duct' && action === 'slide') success = true;
          else if (obs.type === 'barrier' && action === 'wall_run') success = true;

          if (success) {
            state.streak++;
            state.momentum = Math.min(100, state.momentum + 8);
            state.scoreVal += 50 * state.streak;
          } else {
            // Collision penalty!
            state.shields--;
            state.momentum = 20;
            state.streak = 0;
          }
        }
      }
    }

    // Passive momentum decay if cruising without stunt
    if (action === 'run' && state.momentum > 20) {
      state.momentum = Math.max(20, state.momentum - 2);
    }

    if (state.shields <= 0) {
      state.shields = 0;
      state.lost = true;
    } else if (state.distance >= TARGET_DISTANCE) {
      state.won = true;
      state.scoreVal += 2000;
    }

    if (state.stepCount >= MAX_STEPS && !state.won) {
      state.lost = true;
    }

    const reward = state.scoreVal - prevScore;
    const done = isOver(state);
    return { reward, done };
  }

  return {
    TARGET_DISTANCE,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
