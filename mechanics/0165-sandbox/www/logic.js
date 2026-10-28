// 0165-sandbox: Physics Toybox - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

const ROWS = 18;
const COLS = 16;
const TARGET_COLS = [2, 5, 8, 11, 14];
const ELEMENT_TYPES = ['sand', 'water', 'plant', 'fire', 'stone', 'acid', 'dynamite'];

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function createEmptyGrid() {
  const g = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push('empty');
    }
    g.push(row);
  }
  return g;
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const grid = createEmptyGrid();

  // Bottom stone boundary
  for (let c = 0; c < COLS; c++) {
    grid[ROWS - 1][c] = 'stone';
  }

  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 1500,
    grid,
    elementsPlaced: 0,
    glassCreated: 0,
    plantsGrown: 0,
    explosionsDetonated: 0,
    electricalArcs: 0,
    milestones: {
      verdantOasis: false,
      silicaKiln: false,
      kineticDemolition: false,
      arcConduction: false
    },
    victory: false,
    defeat: false,
    gameMessage: 'Creative Physics Toybox active. Drop elements to trigger reactions and fulfill research milestones.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function checkMilestones(state) {
  if (state.plantsGrown >= 8) state.milestones.verdantOasis = true;
  if (state.glassCreated >= 4) state.milestones.silicaKiln = true;
  if (state.explosionsDetonated >= 2) state.milestones.kineticDemolition = true;
  if (state.electricalArcs >= 5) state.milestones.arcConduction = true;
}

function score(state) {
  let val = state.elementsPlaced * 15;
  val += state.glassCreated * 120;
  val += state.plantsGrown * 100;
  val += state.explosionsDetonated * 250;
  val += state.electricalArcs * 80;
  if (state.milestones.verdantOasis) val += 500;
  if (state.milestones.silicaKiln) val += 500;
  if (state.milestones.kineticDemolition) val += 500;
  if (state.milestones.arcConduction) val += 500;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function simulateGrid(state) {
  const g = state.grid;

  // Process from bottom up so falling elements don't drop multiple cells in one tick
  for (let r = ROWS - 2; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      const el = g[r][c];
      if (el === 'empty' || el === 'stone' || el === 'glass') continue;

      // 1. Gravity for solid/liquid falling elements: sand, acid, dynamite
      if (el === 'sand' || el === 'dynamite') {
        if (g[r + 1][c] === 'empty') {
          g[r + 1][c] = el;
          g[r][c] = 'empty';
        } else if (c > 0 && g[r + 1][c - 1] === 'empty') {
          g[r + 1][c - 1] = el;
          g[r][c] = 'empty';
        } else if (c < COLS - 1 && g[r + 1][c + 1] === 'empty') {
          g[r + 1][c + 1] = el;
          g[r][c] = 'empty';
        }
      }

      // 2. Water fluid dynamics
      else if (el === 'water') {
        if (g[r + 1][c] === 'empty') {
          g[r + 1][c] = 'water';
          g[r][c] = 'empty';
        } else {
          // Flow laterally
          const leftEmpty = c > 0 && g[r][c - 1] === 'empty';
          const rightEmpty = c < COLS - 1 && g[r][c + 1] === 'empty';
          if (leftEmpty && rightEmpty) {
            const dir = nextRand(state) < 0.5 ? -1 : 1;
            g[r][c + dir] = 'water';
            g[r][c] = 'empty';
          } else if (leftEmpty) {
            g[r][c - 1] = 'water';
            g[r][c] = 'empty';
          } else if (rightEmpty) {
            g[r][c + 1] = 'water';
            g[r][c] = 'empty';
          }
        }
      }

      // 3. Acid dissolution
      else if (el === 'acid') {
        if (g[r + 1][c] === 'empty') {
          g[r + 1][c] = 'acid';
          g[r][c] = 'empty';
        } else if (g[r + 1][c] !== 'empty') {
          g[r + 1][c] = 'empty';
          g[r][c] = 'empty';
        }
      }

      // 4. Fire thermodynamics & reactions
      else if (el === 'fire') {
        // Check neighbors
        const neighbors = [
          [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
        ];

        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            const nel = g[nr][nc];
            if (nel === 'sand') {
              g[nr][nc] = 'glass';
              state.glassCreated += 1;
            } else if (nel === 'plant') {
              g[nr][nc] = 'fire';
            } else if (nel === 'water') {
              g[nr][nc] = 'empty'; // Evaporates
            } else if (nel === 'dynamite') {
              // Trigger explosion!
              explode(state, nr, nc);
            }
          }
        }

        // Fire burns out
        g[r][c] = 'empty';
      }

      // 5. Plant growth via water
      else if (el === 'plant') {
        const neighbors = [
          [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
        ];
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (g[nr][nc] === 'water') {
              g[nr][nc] = 'plant';
              state.plantsGrown += 1;
              break;
            }
          }
        }
      }

      // 6. Spark dissipation
      else if (el === 'spark') {
        g[r][c] = 'empty';
      }
    }
  }
}

function explode(state, r, c) {
  state.explosionsDetonated += 1;
  const g = state.grid;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS - 1 && nc >= 0 && nc < COLS) {
        g[nr][nc] = 'spark';
      }
    }
  }
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Drop elements across predefined columns
  for (const el of ELEMENT_TYPES) {
    for (const c of TARGET_COLS) {
      if (state.grid[0][c] === 'empty' || state.grid[1][c] === 'empty') {
        actions.push('action:place_element:' + el + ':' + c);
      }
    }
  }

  // Simulation step
  actions.push('action:step_simulation');

  // Lightning strike
  actions.push('action:trigger_lightning_strike');

  // Clear sandbox
  actions.push('action:clear_sandbox');

  // Victory condition
  const m = state.milestones;
  if (m.verdantOasis && m.silicaKiln && m.kineticDemolition && m.arcConduction) {
    actions.push('action:finalize_masterwork');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal sandbox action "' + action + '" in current state');
  }

  const oldScore = score(state);

  if (action.startsWith('action:place_element:')) {
    const parts = action.split(':');
    const el = parts[2];
    const col = parseInt(parts[3], 10);

    // Spawn 2 particles
    if (state.grid[0][col] === 'empty') state.grid[0][col] = el;
    if (state.grid[1][col] === 'empty') state.grid[1][col] = el;
    state.elementsPlaced += 2;
    state.gameMessage = 'Deposited ' + el.toUpperCase() + ' particles into column ' + col + '.';
  } else if (action === 'action:step_simulation') {
    simulateGrid(state);
    state.gameMessage = 'Simulated physics step: gravity, fluid flow, and combustion evaluated.';
  } else if (action === 'action:trigger_lightning_strike') {
    state.electricalArcs += 1;
    const g = state.grid;
    for (let r = 0; r < ROWS - 1; r++) {
      const c = Math.floor(COLS / 2);
      if (g[r][c] === 'dynamite') {
        explode(state, r, c);
      } else if (g[r][c] === 'sand') {
        g[r][c] = 'glass';
        state.glassCreated += 1;
      } else {
        g[r][c] = 'spark';
      }
    }
    state.gameMessage = 'Discharged high-voltage lightning strike down the central chamber!';
  } else if (action === 'action:clear_sandbox') {
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        state.grid[r][c] = 'empty';
      }
    }
    state.gameMessage = 'Cleared sandbox canvas. Bedrock boundary preserved.';
  } else if (action === 'action:finalize_masterwork') {
    state.victory = true;
    state.gameMessage = 'Victory! All physical and alchemical sandbox milestones achieved!';
  }

  // Always run background simulation tick on any action
  simulateGrid(state);
  checkMilestones(state);

  state.turns += 1;
  if (state.turns >= state.maxTurns && !state.victory) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Maximum simulation cycles elapsed before completing all 4 milestones.';
  }

  const newScore = score(state);
  const reward = newScore - oldScore;
  const done = isOver(state);

  return { reward, done };
}

function paintCell(state, el, r, c) {
  if (isOver(state)) return false;
  const row = Math.max(0, Math.min(ROWS - 2, Math.floor(r)));
  const col = Math.max(0, Math.min(COLS - 1, Math.floor(c)));
  if (el === 'lightning') {
    state.electricalArcs += 1;
    for (let rr = 0; rr < ROWS - 1; rr++) {
      if (state.grid[rr][col] === 'dynamite') {
        explode(state, rr, col);
      } else if (state.grid[rr][col] === 'sand') {
        state.grid[rr][col] = 'glass';
        state.glassCreated += 1;
      } else if (state.grid[rr][col] === 'empty' || state.grid[rr][col] === 'water') {
        state.grid[rr][col] = 'spark';
      }
    }
    checkMilestones(state);
    state.gameMessage = 'Discharged lightning bolt down column ' + col + '!';
    return true;
  }
  if (!ELEMENT_TYPES.includes(el)) return false;
  if (el === 'stone' || el === 'fire' || el === 'acid') {
    state.grid[row][col] = el;
    state.elementsPlaced += 1;
  } else {
    if (state.grid[row][col] === 'empty' || state.grid[row][col] === 'spark') {
      state.grid[row][col] = el;
      state.elementsPlaced += 1;
    }
    if (row > 0 && state.grid[row - 1][col] === 'empty' && (el === 'sand' || el === 'water')) {
      state.grid[row - 1][col] = el;
      state.elementsPlaced += 1;
    }
  }
  checkMilestones(state);
  state.gameMessage = 'Painted ' + el.toUpperCase() + ' at (' + col + ', ' + row + ').';
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    paintCell,
    ROWS,
    COLS,
    ELEMENT_TYPES,
    TARGET_COLS
  };
}
