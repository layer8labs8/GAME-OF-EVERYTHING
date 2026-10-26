(function (root) {
  const GRID_SIZE = 8;
  const MAX_STEPS = 180;
  const MAX_MONTHS = 48;
  const TARGET_POP = 300;
  const TARGET_HAPPINESS = 70;

  const COSTS = {
    road: 10,
    res: 25,
    com: 35,
    ind: 50,
    park: 40,
    demolish: 5,
  };

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function createInitialGrid() {
    const grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push({
          type: r === 3 ? 'R' : '.',
          pop: 0,
        });
      }
      grid.push(row);
    }
    return grid;
  }

  function createState(seed) {
    const state = {
      rng: (seed >>> 0) || 1,
      grid: createInitialGrid(),
      cursor: { x: 3, y: 2 },
      funds: 300,
      month: 1,
      population: 0,
      happiness: 80,
      monthlyRevenue: 0,
      monthlyExpenses: 8,
      stepCount: 0,
      won: false,
      lost: false,
      lastEvent: 'Welcome, Mayor! Found your metropolis along the central avenue.',
    };
    return state;
  }

  function hasBasicTermination(state) {
    return Boolean(state.won || state.lost || state.stepCount >= MAX_STEPS);
  }

  function hasAdjacentRoad(grid, r, c) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        if (grid[nr][nc].type === 'R') return true;
      }
    }
    return false;
  }

  function legalActions(state) {
    if (hasBasicTermination(state)) return [];

    const actions = ['next_month'];

    // Cursor navigation
    if (state.cursor.y > 0) actions.push('cursor_up');
    if (state.cursor.y < GRID_SIZE - 1) actions.push('cursor_down');
    if (state.cursor.x > 0) actions.push('cursor_left');
    if (state.cursor.x < GRID_SIZE - 1) actions.push('cursor_right');

    const cell = state.grid[state.cursor.y][state.cursor.x];

    if (cell.type === '.') {
      if (state.funds >= COSTS.road) actions.push('build_road');
      if (state.funds >= COSTS.res) actions.push('zone_residential');
      if (state.funds >= COSTS.com) actions.push('zone_commercial');
      if (state.funds >= COSTS.ind) actions.push('zone_industrial');
      if (state.funds >= COSTS.park) actions.push('build_park');
    } else {
      if (state.funds >= COSTS.demolish) actions.push('demolish');
    }

    return actions;
  }

  function isOver(state) {
    return hasBasicTermination(state) || legalActions(state).length === 0;
  }

  function updateSimulation(state) {
    let newPop = 0;
    let commercialJobs = 0;
    let industrialJobs = 0;
    let revenue = 0;
    let expenses = 0;
    let parksCount = 0;
    let smogViolations = 0;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = state.grid[r][c];
        const connected = hasAdjacentRoad(state.grid, r, c);

        if (cell.type === 'R') {
          expenses += 1; // road upkeep
        } else if (cell.type === 'PARK') {
          parksCount += 1;
          expenses += 2;
        } else if (cell.type === 'RES') {
          if (connected) {
            cell.pop = Math.min(80, cell.pop + 20);
          }
          newPop += cell.pop;
          revenue += Math.floor(cell.pop * 0.3);

          // Check pollution adjacency
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              if (state.grid[nr][nc].type === 'IND') smogViolations += 1;
            }
          }
        } else if (cell.type === 'COM') {
          if (connected) {
            commercialJobs += 40;
            revenue += 22;
          }
        } else if (cell.type === 'IND') {
          if (connected) {
            industrialJobs += 50;
            revenue += 35;
          }
        }
      }
    }

    state.population = newPop;
    state.monthlyRevenue = revenue;
    state.monthlyExpenses = expenses;
    const net = revenue - expenses;
    state.funds += net;

    // Calculate happiness
    const totalJobs = commercialJobs + industrialJobs;
    let happy = 70;
    if (newPop > 0) {
      if (totalJobs >= newPop) happy += 15;
      else happy -= Math.min(30, Math.floor(((newPop - totalJobs) / newPop) * 35));
    }
    happy += Math.min(20, parksCount * 5);
    happy -= Math.min(30, smogViolations * 10);
    state.happiness = Math.max(0, Math.min(100, happy));

    state.month += 1;

    // Win check
    if (state.population >= TARGET_POP && state.happiness >= TARGET_HAPPINESS) {
      state.won = true;
    } else if (state.funds < -100 || state.month > MAX_MONTHS) {
      state.lost = true;
    }
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action: ' + action);

    let reward = 1;

    if (action === 'cursor_up') state.cursor.y -= 1;
    else if (action === 'cursor_down') state.cursor.y += 1;
    else if (action === 'cursor_left') state.cursor.x -= 1;
    else if (action === 'cursor_right') state.cursor.x += 1;
    else if (action === 'build_road') {
      state.funds -= COSTS.road;
      state.grid[state.cursor.y][state.cursor.x] = { type: 'R', pop: 0 };
      reward += 2;
      state.lastEvent = 'Paved new road section (-$10).';
    } else if (action === 'zone_residential') {
      state.funds -= COSTS.res;
      state.grid[state.cursor.y][state.cursor.x] = { type: 'RES', pop: 0 };
      reward += 5;
      state.lastEvent = 'Designated residential zone (-$25).';
    } else if (action === 'zone_commercial') {
      state.funds -= COSTS.com;
      state.grid[state.cursor.y][state.cursor.x] = { type: 'COM', pop: 0 };
      reward += 5;
      state.lastEvent = 'Designated commercial district (-$35).';
    } else if (action === 'zone_industrial') {
      state.funds -= COSTS.ind;
      state.grid[state.cursor.y][state.cursor.x] = { type: 'IND', pop: 0 };
      reward += 5;
      state.lastEvent = 'Designated industrial plant (-$50).';
    } else if (action === 'build_park') {
      state.funds -= COSTS.park;
      state.grid[state.cursor.y][state.cursor.x] = { type: 'PARK', pop: 0 };
      reward += 8;
      state.lastEvent = 'Cultivated botanical park (-$40).';
    } else if (action === 'demolish') {
      state.funds -= COSTS.demolish;
      state.grid[state.cursor.y][state.cursor.x] = { type: '.', pop: 0 };
      state.lastEvent = 'Bulldozed plot to open terrain (-$5).';
    } else if (action === 'next_month') {
      updateSimulation(state);
      reward += Math.floor(state.population * 0.1);
      state.lastEvent = `Month ${state.month} | Pop: ${state.population} | Net: $${state.monthlyRevenue - state.monthlyExpenses}`;
    }

    state.stepCount += 1;
    const done = isOver(state);
    return { reward, done };
  }

  function score(state) {
    if (state.won) return Math.max(100, state.population * 2 + state.funds);
    return Math.max(0, state.population + Math.floor(state.funds * 0.5));
  }

  const api = {
    GRID_SIZE,
    MAX_STEPS,
    MAX_MONTHS,
    TARGET_POP,
    TARGET_HAPPINESS,
    COSTS,
    createState,
    legalActions,
    step,
    isOver,
    score,
    hasAdjacentRoad,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
