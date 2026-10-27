// Gravity Sling - Physics Puzzle deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GravitySling = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 50;

  const LEVELS = [
    {
      id: '001',
      name: 'Orbital Drift',
      difficulty: 1,
      width: 8, height: 8, maxFuel: 5,
      probe: { x: 1, y: 1 },
      goal: { x: 6, y: 1 },
      beacons: [{ x: 3, y: 1 }],
      wells: [],
      asteroids: []
    },
    {
      id: '002',
      name: 'Diagonal Vector',
      difficulty: 1,
      width: 8, height: 8, maxFuel: 6,
      probe: { x: 1, y: 1 },
      goal: { x: 6, y: 6 },
      beacons: [{ x: 3, y: 3 }],
      wells: [],
      asteroids: []
    },
    {
      id: '003',
      name: 'Asteroid Gate',
      difficulty: 2,
      width: 9, height: 9, maxFuel: 6,
      probe: { x: 1, y: 4 },
      goal: { x: 7, y: 4 },
      beacons: [{ x: 4, y: 2 }],
      wells: [],
      asteroids: [{ x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }]
    },
    {
      id: '004',
      name: 'Singularity Sling',
      difficulty: 2,
      width: 9, height: 9, maxFuel: 5,
      probe: { x: 1, y: 2 },
      goal: { x: 7, y: 6 },
      beacons: [{ x: 4, y: 6 }],
      wells: [{ x: 4, y: 3, range: 2 }],
      asteroids: []
    },
    {
      id: '005',
      name: 'Binary Beacons',
      difficulty: 3,
      width: 9, height: 9, maxFuel: 8,
      probe: { x: 1, y: 4 },
      goal: { x: 7, y: 4 },
      beacons: [{ x: 3, y: 2 }, { x: 5, y: 6 }],
      wells: [{ x: 4, y: 4, range: 2 }],
      asteroids: [{ x: 4, y: 1 }, { x: 4, y: 7 }]
    },
    {
      id: '006',
      name: 'Event Horizon',
      difficulty: 3,
      width: 10, height: 10, maxFuel: 7,
      probe: { x: 1, y: 1 },
      goal: { x: 8, y: 8 },
      beacons: [{ x: 2, y: 7 }, { x: 7, y: 2 }],
      wells: [{ x: 5, y: 5, range: 3 }],
      asteroids: [{ x: 4, y: 5 }, { x: 6, y: 5 }]
    },
    {
      id: '007',
      name: 'Twin Pulsars',
      difficulty: 4,
      width: 10, height: 10, maxFuel: 8,
      probe: { x: 1, y: 5 },
      goal: { x: 8, y: 5 },
      beacons: [{ x: 5, y: 2 }, { x: 5, y: 8 }],
      wells: [{ x: 3, y: 5, range: 2 }, { x: 7, y: 5, range: 2 }],
      asteroids: [{ x: 5, y: 4 }, { x: 5, y: 6 }]
    },
    {
      id: '008',
      name: 'Corridor of Shards',
      difficulty: 4,
      width: 10, height: 10, maxFuel: 8,
      probe: { x: 1, y: 2 },
      goal: { x: 8, y: 7 },
      beacons: [{ x: 5, y: 5 }],
      wells: [{ x: 3, y: 7, range: 2 }, { x: 7, y: 2, range: 2 }],
      asteroids: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 6, y: 6 }, { x: 7, y: 6 }]
    },
    {
      id: '009',
      name: 'Triad Resonance',
      difficulty: 5,
      width: 11, height: 11, maxFuel: 10,
      probe: { x: 1, y: 1 },
      goal: { x: 9, y: 9 },
      beacons: [{ x: 5, y: 1 }, { x: 9, y: 5 }, { x: 5, y: 9 }],
      wells: [{ x: 5, y: 5, range: 3 }],
      asteroids: [{ x: 4, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 6 }]
    },
    {
      id: '010',
      name: 'Galactic Gauntlet',
      difficulty: 5,
      width: 11, height: 11, maxFuel: 12,
      probe: { x: 1, y: 5 },
      goal: { x: 9, y: 5 },
      beacons: [{ x: 3, y: 2 }, { x: 7, y: 8 }, { x: 5, y: 1 }],
      wells: [{ x: 3, y: 5, range: 2 }, { x: 7, y: 5, range: 2 }],
      asteroids: [{ x: 5, y: 3 }, { x: 5, y: 7 }, { x: 1, y: 4 }, { x: 1, y: 6 }]
    }
  ];

  function createState(seed = 12345, levelIndex) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const lIdx = (levelIndex !== undefined && levelIndex !== null)
      ? Math.abs(levelIndex) % LEVELS.length
      : Math.abs(s) % LEVELS.length;

    const lvl = LEVELS[lIdx];

    return {
      rng: s,
      levelIndex: lIdx,
      levelName: lvl.name,
      difficulty: lvl.difficulty,
      width: lvl.width,
      height: lvl.height,
      maxFuel: lvl.maxFuel,
      fuel: lvl.maxFuel,
      probe: { x: lvl.probe.x, y: lvl.probe.y },
      goal: { x: lvl.goal.x, y: lvl.goal.y },
      vx: 0,
      vy: 0,
      beacons: lvl.beacons.map(b => ({ x: b.x, y: b.y })),
      wells: lvl.wells.map(w => ({ x: w.x, y: w.y, range: w.range || 2 })),
      asteroids: lvl.asteroids.map(a => ({ x: a.x, y: a.y })),
      collectedMask: 0,
      stepCount: 0,
      scoreVal: 0,
      won: false,
      lost: false,
      trajectory: [{ x: lvl.probe.x, y: lvl.probe.y }]
    };
  }

  function legalActions(state) {
    if (state.won || state.lost || state.stepCount >= MAX_STEPS) {
      return [];
    }

    const actions = [];
    if (state.fuel > 0) {
      actions.push('thrust_up', 'thrust_down', 'thrust_left', 'thrust_right');
    }
    actions.push('coast');
    return actions;
  }

  function isOver(state) {
    return state.won || state.lost || state.stepCount >= MAX_STEPS;
  }

  function score(state) {
    return state.scoreVal;
  }

  function step(state, action) {
    const valid = legalActions(state);
    if (!valid.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    state.stepCount++;
    let reward = 0;

    // Apply thrust
    if (action === 'thrust_up') {
      state.vy -= 1;
      state.fuel -= 1;
    } else if (action === 'thrust_down') {
      state.vy += 1;
      state.fuel -= 1;
    } else if (action === 'thrust_left') {
      state.vx -= 1;
      state.fuel -= 1;
    } else if (action === 'thrust_right') {
      state.vx += 1;
      state.fuel -= 1;
    } else if (action === 'coast') {
      // no fuel change
    }

    // Apply gravity wells
    const px = state.probe.x;
    const py = state.probe.y;
    for (let i = 0; i < state.wells.length; i++) {
      const w = state.wells[i];
      const dx = w.x - px;
      const dy = w.y - py;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist <= w.range) {
        if (dx > 0) state.vx += 1; else if (dx < 0) state.vx -= 1;
        if (dy > 0) state.vy += 1; else if (dy < 0) state.vy -= 1;
      }
    }

    // Clamp velocity to [-2, 2]
    state.vx = Math.max(-2, Math.min(2, state.vx));
    state.vy = Math.max(-2, Math.min(2, state.vy));

    // If completely stationary and out of fuel, craft is stranded
    if (state.vx === 0 && state.vy === 0 && state.fuel <= 0) {
      state.lost = true;
      reward = -100;
      return { reward, done: true };
    }

    // Sub-step movement ray
    const sub = Math.max(Math.abs(state.vx), Math.abs(state.vy));
    const targetMask = (1 << state.beacons.length) - 1;
    let crashed = false;
    let won = false;

    for (let s = 1; s <= sub; s++) {
      const ix = Math.round(px + (state.vx * s) / sub);
      const iy = Math.round(py + (state.vy * s) / sub);

      // Boundary check
      if (ix < 0 || ix >= state.width || iy < 0 || iy >= state.height) {
        crashed = true;
        break;
      }

      // Asteroid collision
      for (let i = 0; i < state.asteroids.length; i++) {
        if (state.asteroids[i].x === ix && state.asteroids[i].y === iy) {
          crashed = true;
          break;
        }
      }
      if (crashed) break;

      // Singularity collision
      for (let i = 0; i < state.wells.length; i++) {
        if (state.wells[i].x === ix && state.wells[i].y === iy) {
          crashed = true;
          break;
        }
      }
      if (crashed) break;

      // Beacon pickup
      for (let i = 0; i < state.beacons.length; i++) {
        const b = state.beacons[i];
        if (b.x === ix && b.y === iy) {
          if ((state.collectedMask & (1 << i)) === 0) {
            state.collectedMask |= (1 << i);
            state.scoreVal += 100;
            reward += 100;
          }
        }
      }

      // Goal detection
      if (state.collectedMask === targetMask && ix === state.goal.x && iy === state.goal.y) {
        won = true;
        state.probe.x = ix;
        state.probe.y = iy;
        state.trajectory.push({ x: ix, y: iy });
        break;
      }
    }

    if (crashed) {
      state.lost = true;
      reward = -100;
      return { reward, done: true };
    }

    if (won) {
      state.won = true;
      const fuelBonus = state.fuel * 50;
      const stepBonus = Math.max(0, (MAX_STEPS - state.stepCount) * 10);
      const winReward = 500 + fuelBonus + stepBonus;
      state.scoreVal += winReward;
      reward += winReward;
      return { reward, done: true };
    }

    // Update probe position
    state.probe.x += state.vx;
    state.probe.y += state.vy;
    state.trajectory.push({ x: state.probe.x, y: state.probe.y });

    if (state.stepCount >= MAX_STEPS) {
      state.lost = true;
      reward = -50;
      return { reward, done: true };
    }

    return { reward, done: false };
  }

  return {
    MAX_STEPS,
    LEVELS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
});
