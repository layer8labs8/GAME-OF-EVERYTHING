(function (root) {
  const GRID_W = 10;
  const GRID_H = 8;
  const MAX_STEPS = 120;

  const DIR_OFFSETS = {
    N: { x: 0, y: -1 },
    S: { x: 0, y: 1 },
    E: { x: 1, y: 0 },
    W: { x: -1, y: 0 },
  };

  const MOVE_DELTAS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const BASE_LAYOUT = [
    '##########',
    '#S..#....#',
    '#...#..D.#',
    '#...#....#',
    '#..##..###',
    '#........#',
    '#....#..E#',
    '##########',
  ];

  function getBaseLayout() {
    return BASE_LAYOUT.map((row) => row.split(''));
  }

  function getGuardVisionTiles(guard, grid) {
    const visible = [];
    const fwd = DIR_OFFSETS[guard.dir];
    let leftOffset, rightOffset;
    if (guard.dir === 'N') { leftOffset = { x: -1, y: -1 }; rightOffset = { x: 1, y: -1 }; }
    else if (guard.dir === 'S') { leftOffset = { x: 1, y: 1 }; rightOffset = { x: -1, y: 1 }; }
    else if (guard.dir === 'E') { leftOffset = { x: 1, y: -1 }; rightOffset = { x: 1, y: 1 }; }
    else { leftOffset = { x: -1, y: 1 }; rightOffset = { x: -1, y: -1 }; }

    // Direct forward beam up to 3 tiles
    for (let dist = 1; dist <= 3; dist++) {
      const tx = guard.x + fwd.x * dist;
      const ty = guard.y + fwd.y * dist;
      if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) break;
      visible.push({ x: tx, y: ty });
      if (grid[ty][tx] === '#') break;
    }

    // Peripheral forward flank (1 step)
    for (const flank of [leftOffset, rightOffset]) {
      const tx = guard.x + flank.x;
      const ty = guard.y + flank.y;
      if (tx >= 0 && tx < GRID_W && ty >= 0 && ty < GRID_H) {
        const directFwdX = guard.x + fwd.x;
        const directFwdY = guard.y + fwd.y;
        if (directFwdX >= 0 && directFwdX < GRID_W && directFwdY >= 0 && directFwdY < GRID_H && grid[directFwdY][directFwdX] !== '#') {
          visible.push({ x: tx, y: ty });
        }
      }
    }

    return visible;
  }

  function canGuardSeePlayer(guard, px, py, grid) {
    const tiles = getGuardVisionTiles(guard, grid);
    return tiles.some((t) => t.x === px && t.y === py && grid[t.y][t.x] !== '#');
  }

  function anyGuardSeesPlayer(guards, px, py, grid) {
    return guards.some((g) => canGuardSeePlayer(g, px, py, grid));
  }

  function createState(seed) {
    const state = {
      rng: (seed >>> 0) || 1,
      grid: getBaseLayout(),
      player: { x: 1, y: 1 },
      intelPos: { x: 7, y: 2 },
      exitPos: { x: 8, y: 6 },
      intelCollected: false,
      pebbles: 2,
      stepCount: 0,
      won: false,
      captured: false,
      score: 0,
      guards: [
        {
          id: 1,
          x: 6,
          y: 2,
          dir: 'S',
          waypoints: [
            { x: 6, y: 2, dir: 'S' },
            { x: 6, y: 5, dir: 'W' },
            { x: 3, y: 5, dir: 'N' },
            { x: 3, y: 2, dir: 'E' },
          ],
          waypointIdx: 0,
          investigate: null,
        },
        {
          id: 2,
          x: 2,
          y: 6,
          dir: 'E',
          waypoints: [
            { x: 2, y: 6, dir: 'E' },
            { x: 7, y: 6, dir: 'W' },
          ],
          waypointIdx: 0,
          investigate: null,
        },
      ],
      lastNoise: null,
    };
    return state;
  }

  function hasBasicTermination(state) {
    return Boolean(state.won || state.captured || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    if (hasBasicTermination(state)) return [];

    const actions = ['wait'];

    for (const [actionName, delta] of Object.entries(MOVE_DELTAS)) {
      const nx = state.player.x + delta.x;
      const ny = state.player.y + delta.y;
      if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
        if (state.grid[ny][nx] !== '#') {
          actions.push(actionName);
        }
      }
    }

    if (state.pebbles > 0) {
      for (const dir of ['up', 'down', 'left', 'right']) {
        actions.push('pebble_' + dir);
      }
    }

    return actions;
  }

  function isOver(state) {
    return hasBasicTermination(state) || legalActions(state).length === 0;
  }

  function updateGuard(guard, grid) {
    if (guard.investigate) {
      const tx = guard.investigate.x;
      const ty = guard.investigate.y;
      const dx = tx - guard.x;
      const dy = ty - guard.y;

      if (dx === 0 && dy === 0) {
        guard.investigate = null;
      } else {
        let mx = 0;
        let my = 0;
        if (Math.abs(dx) >= Math.abs(dy)) {
          mx = dx > 0 ? 1 : -1;
          guard.dir = mx > 0 ? 'E' : 'W';
        } else {
          my = dy > 0 ? 1 : -1;
          guard.dir = my > 0 ? 'S' : 'N';
        }

        const nx = guard.x + mx;
        const ny = guard.y + my;
        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && grid[ny][nx] !== '#') {
          guard.x = nx;
          guard.y = ny;
        } else {
          guard.investigate = null;
        }
      }
      return;
    }

    const wp = guard.waypoints[guard.waypointIdx];
    if (guard.x === wp.x && guard.y === wp.y) {
      guard.dir = wp.dir;
      guard.waypointIdx = (guard.waypointIdx + 1) % guard.waypoints.length;
    } else {
      const dx = wp.x - guard.x;
      const dy = wp.y - guard.y;
      let mx = 0;
      let my = 0;
      if (Math.abs(dx) > 0) {
        mx = dx > 0 ? 1 : -1;
        guard.dir = mx > 0 ? 'E' : 'W';
      } else if (Math.abs(dy) > 0) {
        my = dy > 0 ? 1 : -1;
        guard.dir = my > 0 ? 'S' : 'N';
      }
      const nx = guard.x + mx;
      const ny = guard.y + my;
      if (grid[ny][nx] !== '#') {
        guard.x = nx;
        guard.y = ny;
      }
    }
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action: ' + action);

    let reward = 1;
    state.lastNoise = null;

    // Execute Player action
    if (action.startsWith('pebble_')) {
      state.pebbles -= 1;
      const dir = action.slice(7);
      const delta = MOVE_DELTAS[dir];
      let px = state.player.x;
      let py = state.player.y;
      for (let d = 1; d <= 3; d++) {
        const nx = px + delta.x;
        const ny = py + delta.y;
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H || state.grid[ny][nx] === '#') break;
        px = nx;
        py = ny;
      }
      state.lastNoise = { x: px, y: py };

      for (const g of state.guards) {
        const dist = Math.abs(g.x - px) + Math.abs(g.y - py);
        if (dist <= 4) {
          g.investigate = { x: px, y: py };
        }
      }
    } else if (action !== 'wait') {
      const delta = MOVE_DELTAS[action];
      state.player.x += delta.x;
      state.player.y += delta.y;
    }

    // Immediate check: did player move into a guard's sight?
    if (anyGuardSeesPlayer(state.guards, state.player.x, state.player.y, state.grid)) {
      state.captured = true;
      reward = -100;
      state.stepCount += 1;
      return { reward, done: true };
    }

    // Check intel pickup
    if (!state.intelCollected && state.player.x === state.intelPos.x && state.player.y === state.intelPos.y) {
      state.intelCollected = true;
      reward += 50;
      state.score += 50;
    }

    // Check exit reach
    if (state.intelCollected && state.player.x === state.exitPos.x && state.player.y === state.exitPos.y) {
      state.won = true;
      reward += 100;
      state.score += 100;
      state.stepCount += 1;
      return { reward, done: true };
    }

    // Update guards
    for (const g of state.guards) {
      updateGuard(g, state.grid);
    }

    // Secondary check: did a guard move or turn into line of sight with player?
    if (anyGuardSeesPlayer(state.guards, state.player.x, state.player.y, state.grid)) {
      state.captured = true;
      reward = -100;
      state.stepCount += 1;
      return { reward, done: true };
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
    DIR_OFFSETS,
    MOVE_DELTAS,
    getGuardVisionTiles,
    canGuardSeePlayer,
    anyGuardSeesPlayer,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
