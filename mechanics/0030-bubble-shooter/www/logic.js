(function (root) {
  const COLS = 8;
  const ROWS = 10;
  const CELLS = COLS * ROWS;
  const NUM_COLORS = 4;
  const MAX_SHOTS = 60;
  const CEILING_INTERVAL = 6;
  const DANGER_ROW = 8;
  const ANGLES = [-60, -45, -30, -15, 0, 15, 30, 45, 60];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function rollOrb(state) {
    return 1 + Math.floor(nextRandom(state) * NUM_COLORS);
  }

  function cellPos(idx) {
    const r = Math.floor(idx / COLS);
    const c = idx % COLS;
    return { x: 26 + c * 44, y: 44 + r * 44 };
  }

  function getNeighbors(idx) {
    const r = Math.floor(idx / COLS);
    const c = idx % COLS;
    const n = [];
    if (c > 0) n.push(r * COLS + (c - 1));
    if (c < COLS - 1) n.push(r * COLS + (c + 1));
    if (r > 0) n.push((r - 1) * COLS + c);
    if (r < ROWS - 1) n.push((r + 1) * COLS + c);
    return n;
  }

  function createState(seed) {
    const state = {
      grid: new Array(CELLS).fill(0),
      currentOrb: 1,
      nextOrb: 2,
      shotsLeft: MAX_SHOTS,
      shotsUntilDrop: CEILING_INTERVAL,
      points: 0,
      lastPopped: 0,
      lastDropped: 0,
      won: false,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };

    // Fill initial 3 rows
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < COLS; c++) {
        state.grid[r * COLS + c] = rollOrb(state);
      }
    }
    state.currentOrb = rollOrb(state);
    state.nextOrb = rollOrb(state);

    return state;
  }

  function isOver(state) {
    if (state.won || state.shotsLeft <= 0) return true;
    for (let r = DANGER_ROW; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (state.grid[r * COLS + c] !== 0) return true;
      }
    }
    return false;
  }

  function legalActions(state) {
    return isOver(state) ? [] : ANGLES.slice();
  }

  function findLandingSlot(grid, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    let vx = Math.cos(rad) * 10;
    let vy = Math.sin(rad) * 10;
    let x = 180;
    let y = 580;

    while (y > 36) {
      x += vx;
      y += vy;
      if (x <= 26) { x = 26; vx = Math.abs(vx); }
      else if (x >= 334) { x = 334; vx = -Math.abs(vx); }

      // Check collision against occupied cells
      let hit = y <= 48;
      if (!hit) {
        for (let i = 0; i < CELLS; i++) {
          if (grid[i] !== 0) {
            const p = cellPos(i);
            const dx = p.x - x;
            const dy = p.y - y;
            if (dx * dx + dy * dy < 38 * 38) {
              hit = true;
              break;
            }
          }
        }
      }

      if (hit) {
        // Find closest empty cell
        let bestIdx = -1;
        let minDist = Infinity;
        for (let i = 0; i < CELLS; i++) {
          if (grid[i] === 0) {
            const p = cellPos(i);
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
              minDist = dist;
              bestIdx = i;
            }
          }
        }
        return bestIdx;
      }
    }

    // Default to top available cell
    for (let c = 0; c < COLS; c++) {
      if (grid[c] === 0) return c;
    }
    return 0;
  }

  function step(state, action) {
    if (isOver(state) || typeof action !== 'number' || !ANGLES.includes(action)) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    state.shotsLeft -= 1;
    let reward = 0;

    const landIdx = findLandingSlot(state.grid, action);
    state.grid[landIdx] = state.currentOrb;
    const color = state.currentOrb;

    // BFS for connected cluster
    const cluster = [landIdx];
    const visited = new Array(CELLS).fill(false);
    visited[landIdx] = true;
    let head = 0;

    while (head < cluster.length) {
      const cur = cluster[head++];
      const nbs = getNeighbors(cur);
      for (let i = 0; i < nbs.length; i++) {
        const nb = nbs[i];
        if (!visited[nb] && state.grid[nb] === color) {
          visited[nb] = true;
          cluster.push(nb);
        }
      }
    }

    let poppedCount = 0;
    let droppedCount = 0;

    if (cluster.length >= 3) {
      poppedCount = cluster.length;
      for (let i = 0; i < cluster.length; i++) {
        state.grid[cluster[i]] = 0;
      }
      reward += poppedCount * 20;

      // Drop floating orbs
      const anchored = new Array(CELLS).fill(false);
      const queue = [];
      for (let c = 0; c < COLS; c++) {
        if (state.grid[c] !== 0) {
          anchored[c] = true;
          queue.push(c);
        }
      }

      head = 0;
      while (head < queue.length) {
        const cur = queue[head++];
        const nbs = getNeighbors(cur);
        for (let i = 0; i < nbs.length; i++) {
          const nb = nbs[i];
          if (!anchored[nb] && state.grid[nb] !== 0) {
            anchored[nb] = true;
            queue.push(nb);
          }
        }
      }

      for (let i = 0; i < CELLS; i++) {
        if (state.grid[i] !== 0 && !anchored[i]) {
          state.grid[i] = 0;
          droppedCount += 1;
        }
      }
      reward += droppedCount * 40;
    }

    state.lastPopped = poppedCount;
    state.lastDropped = droppedCount;
    state.points += reward;

    // Advance ceiling timer
    state.shotsUntilDrop -= 1;
    if (state.shotsUntilDrop <= 0) {
      state.shotsUntilDrop = CEILING_INTERVAL;
      for (let r = ROWS - 1; r >= 1; r--) {
        for (let c = 0; c < COLS; c++) {
          state.grid[r * COLS + c] = state.grid[(r - 1) * COLS + c];
        }
      }
      for (let c = 0; c < COLS; c++) {
        state.grid[c] = rollOrb(state);
      }
    }

    // Check win (board empty)
    if (state.grid.every((v) => v === 0)) {
      state.won = true;
      state.points += 500;
      reward += 500;
    }

    // Next orbs
    state.currentOrb = state.nextOrb;
    state.nextOrb = rollOrb(state);

    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { COLS, ROWS, CELLS, NUM_COLORS, ANGLES, cellPos, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
