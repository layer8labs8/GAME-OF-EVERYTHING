(function (root) {
  const GRID_W = 16;
  const GRID_H = 12;
  const MAX_STEPS = 180;
  const GRAVITY = 0.3;
  const TERMINAL_VEL = 1.8;

  const MAP = [
    '################',
    '#..............#',
    '#..C...........#',
    '#..####.....C..#',
    '#........#####.#',
    '#..###.........#',
    '#......^^......#',
    '#..######...P..#',
    '#.........####.#',
    '#S..^^^........#',
    '################',
    '################',
  ];

  function getBaseMap() {
    return MAP.map((r) => r.split(''));
  }

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function createState(seed) {
    const state = {
      rng: (seed >>> 0) || 1,
      grid: getBaseMap(),
      player: {
        x: 1.5,
        y: 8.9,
        vx: 0,
        vy: 0,
        grounded: true,
        dashes: 1,
        lives: 3,
      },
      spawn: { x: 1.5, y: 8.9 },
      crystals: [
        { x: 3.5, y: 2.5, collected: false },
        { x: 12.5, y: 3.5, collected: false },
      ],
      portal: { x: 12.5, y: 7.5 },
      stepCount: 0,
      score: 0,
      won: false,
      lost: false,
    };
    return state;
  }

  function hasBasicTermination(state) {
    return Boolean(state.won || state.lost || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    if (hasBasicTermination(state)) return [];

    const actions = ['wait', 'left', 'right'];

    if (state.player.grounded) {
      actions.push('jump');
    }

    if (state.player.dashes > 0) {
      actions.push('dash_right', 'dash_left', 'dash_up', 'dash_up_right');
    }

    return actions;
  }

  function isOver(state) {
    return hasBasicTermination(state) || legalActions(state).length === 0;
  }

  function collidesBlock(grid, left, right, top, bottom) {
    const minCol = Math.max(0, Math.floor(left));
    const maxCol = Math.min(GRID_W - 1, Math.floor(right));
    const minRow = Math.max(0, Math.floor(top));
    const maxRow = Math.min(GRID_H - 1, Math.floor(bottom));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (grid[r][c] === '#') return true;
      }
    }
    return false;
  }

  function overlapsSpike(grid, left, right, top, bottom) {
    const minCol = Math.max(0, Math.floor(left));
    const maxCol = Math.min(GRID_W - 1, Math.floor(right));
    const minRow = Math.max(0, Math.floor(top));
    const maxRow = Math.min(GRID_H - 1, Math.floor(bottom));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (grid[r][c] === '^') return true;
      }
    }
    return false;
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action: ' + action);

    let reward = 1;

    // Apply player input forces
    if (action === 'left') {
      state.player.vx = -0.8;
    } else if (action === 'right') {
      state.player.vx = 0.8;
    } else if (action === 'jump') {
      state.player.vy = -1.6;
      state.player.grounded = false;
    } else if (action === 'dash_right') {
      state.player.vx = 2.0;
      state.player.vy = -0.2;
      state.player.dashes -= 1;
    } else if (action === 'dash_left') {
      state.player.vx = -2.0;
      state.player.vy = -0.2;
      state.player.dashes -= 1;
    } else if (action === 'dash_up') {
      state.player.vy = -1.8;
      state.player.vx = 0;
      state.player.dashes -= 1;
    } else if (action === 'dash_up_right') {
      state.player.vx = 1.4;
      state.player.vy = -1.4;
      state.player.dashes -= 1;
    }

    // Apply gravity
    if (!state.player.grounded) {
      state.player.vy = Math.min(TERMINAL_VEL, state.player.vy + GRAVITY);
    }

    // Horizontal movement & collision
    const nx = state.player.x + state.player.vx;
    if (collidesBlock(state.grid, nx - 0.28, nx + 0.28, state.player.y - 0.78, state.player.y)) {
      state.player.vx = 0;
    } else {
      state.player.x = nx;
    }
    state.player.vx *= 0.6;
    if (Math.abs(state.player.vx) < 0.02) state.player.vx = 0;

    // Vertical movement & collision
    const ny = state.player.y + state.player.vy;
    if (state.player.vy > 0) {
      // Falling downward
      if (collidesBlock(state.grid, state.player.x - 0.28, state.player.x + 0.28, ny - 0.78, ny)) {
        state.player.y = Math.floor(ny);
        state.player.vy = 0;
        state.player.grounded = true;
        state.player.dashes = 1;
      } else {
        state.player.y = ny;
        state.player.grounded = false;
      }
    } else if (state.player.vy < 0) {
      // Moving upward
      if (collidesBlock(state.grid, state.player.x - 0.28, state.player.x + 0.28, ny - 0.78, ny)) {
        state.player.vy = 0;
      } else {
        state.player.y = ny;
        state.player.grounded = false;
      }
    }

    // Check if grounded still has solid block underneath
    if (state.player.grounded) {
      if (!collidesBlock(state.grid, state.player.x - 0.28, state.player.x + 0.28, state.player.y, state.player.y + 0.05)) {
        state.player.grounded = false;
      }
    }

    // Spike hazard check
    if (overlapsSpike(state.grid, state.player.x - 0.25, state.player.x + 0.25, state.player.y - 0.75, state.player.y)) {
      state.player.lives -= 1;
      reward = -20;
      state.player.x = state.spawn.x;
      state.player.y = state.spawn.y;
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.grounded = true;
      state.player.dashes = 1;
      if (state.player.lives <= 0) {
        state.lost = true;
      }
    }

    // Crystal collection check
    for (const c of state.crystals) {
      if (!c.collected) {
        const dx = Math.abs(state.player.x - c.x);
        const dy = Math.abs((state.player.y - 0.4) - c.y);
        if (dx < 0.6 && dy < 0.6) {
          c.collected = true;
          reward += 30;
          state.score += 30;
        }
      }
    }

    // Portal check
    const allCrystals = state.crystals.every((c) => c.collected);
    if (allCrystals) {
      const pdx = Math.abs(state.player.x - state.portal.x);
      const pdy = Math.abs((state.player.y - 0.4) - state.portal.y);
      if (pdx < 0.7 && pdy < 0.7) {
        state.won = true;
        reward += 100;
        state.score += 100;
      }
    }

    state.stepCount += 1;
    state.score += 1;
    const done = isOver(state);
    return { reward, done };
  }

  function score(state) {
    return Math.max(0, state.score);
  }

  const api = {
    GRID_W,
    GRID_H,
    MAX_STEPS,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
