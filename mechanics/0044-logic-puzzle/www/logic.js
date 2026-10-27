// Circuit Relay - Logic Puzzle deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CircuitRelay = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 60;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function toggleCell(grid, size, idx) {
    const x = idx % size;
    const y = Math.floor(idx / size);

    // Toggle self
    grid[idx] ^= 1;

    // Toggle orthogonal neighbors
    if (x > 0) grid[idx - 1] ^= 1;
    if (x < size - 1) grid[idx + 1] ^= 1;
    if (y > 0) grid[idx - size] ^= 1;
    if (y < size - 1) grid[idx + size] ^= 1;
  }

  function isAllPowered(grid) {
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== 1) return false;
    }
    return true;
  }

  function countPowered(grid) {
    let count = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) count++;
    }
    return count;
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      size: 3,
      scoreVal: 0,
      won: false,
      lost: false,
      grid: [1, 1, 1, 1, 1, 1, 1, 1, 1] // Start all powered
    };

    // Apply 3 to 5 distinct scrambles to create guaranteed solvable puzzle
    const numToggles = 3 + Math.floor(nextRandom(state) * 3);
    const toggled = new Set();
    while (toggled.size < numToggles) {
      const idx = Math.floor(nextRandom(state) * (state.size * state.size));
      toggled.add(idx);
    }
    for (const idx of toggled) {
      toggleCell(state.grid, state.size, idx);
    }

    // Safety fallback: if accidentally all 1, flip center cell
    if (isAllPowered(state.grid)) {
      toggleCell(state.grid, state.size, 4);
    }

    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    const totalCells = state.size * state.size;
    for (let i = 0; i < totalCells; i++) {
      actions.push(`toggle_${i}`);
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

    const idx = parseInt(action.replace('toggle_', ''), 10);
    const prevPowered = countPowered(state.grid);

    toggleCell(state.grid, state.size, idx);

    const newPowered = countPowered(state.grid);
    // Reward for increasing powered cells
    if (newPowered > prevPowered) {
      state.scoreVal += (newPowered - prevPowered) * 25;
    }

    if (isAllPowered(state.grid)) {
      state.won = true;
      state.scoreVal += 1000;
    } else if (state.stepCount >= MAX_STEPS) {
      state.lost = true;
    }

    const reward = state.scoreVal - prevScore;
    const done = isOver(state);
    return { reward, done };
  }

  return {
    createState,
    legalActions,
    step,
    isOver,
    score,
    toggleCell,
    isAllPowered
  };
});
