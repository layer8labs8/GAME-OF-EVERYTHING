// Pure deterministic logic for 0059: Organizing (Tidy Bento)

const GRID_SIZE = 4;
const MAX_STAGES = 3;
const MAX_MOVES_PER_STAGE = 50;

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAGE_RECIPES = [
  // Stage 1: Classic Onigiri Bento (16 cells total)
  [
    { name: 'Onigiri', color: '#f8fafc', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }] },
    { name: 'Tamago', color: '#facc15', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
    { name: 'Tamago', color: '#facc15', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
    { name: 'Salmon', color: '#f87171', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
    { name: 'Salmon', color: '#f87171', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
    { name: 'Edamame', color: '#4ade80', cells: [{ dx: 0, dy: 0 }] },
    { name: 'Edamame', color: '#4ade80', cells: [{ dx: 0, dy: 0 }] },
    { name: 'Umeboshi', color: '#e11d48', cells: [{ dx: 0, dy: 0 }] },
    { name: 'Umeboshi', color: '#e11d48', cells: [{ dx: 0, dy: 0 }] }
  ],
  // Stage 2: Tempura & Avocado Bento (16 cells total)
  [
    { name: 'Rice Bed', color: '#f1f5f9', cells: [
      { dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 }
    ] },
    { name: 'Tempura', color: '#fbbf24', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }] },
    { name: 'Avocado', color: '#16a34a', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }] },
    { name: 'Maki', color: '#334155', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
    { name: 'Tomato', color: '#ef4444', cells: [{ dx: 0, dy: 0 }] },
    { name: 'Tomato', color: '#ef4444', cells: [{ dx: 0, dy: 0 }] }
  ],
  // Stage 3: Katsu Feast Bento (16 cells total)
  [
    { name: 'Katsu', color: '#b45309', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 1, dy: 1 }] },
    { name: 'Nori', color: '#1e293b', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 }] },
    { name: 'Mochi', color: '#fbcfe8', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
    { name: 'Mochi', color: '#fbcfe8', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
    { name: 'Grape', color: '#a855f7', cells: [{ dx: 0, dy: 0 }] },
    { name: 'Grape', color: '#a855f7', cells: [{ dx: 0, dy: 0 }] },
    { name: 'Plum', color: '#f43f5e', cells: [{ dx: 0, dy: 0 }] },
    { name: 'Plum', color: '#f43f5e', cells: [{ dx: 0, dy: 0 }] }
  ]
];

function normalizeCells(cells) {
  let minX = Infinity;
  let minY = Infinity;
  for (const c of cells) {
    if (c.dx < minX) minX = c.dx;
    if (c.dy < minY) minY = c.dy;
  }
  return cells
    .map(c => ({ dx: c.dx - minX, dy: c.dy - minY }))
    .sort((a, b) => (a.dy !== b.dy ? a.dy - b.dy : a.dx - b.dx));
}

function rotateCells(cells) {
  // Rotate 90 deg clockwise: newDx = -dy, newDy = dx
  const rotated = cells.map(c => ({ dx: -c.dy, dy: c.dx }));
  return normalizeCells(rotated);
}

function initStage(state, stageNum) {
  const recipe = STAGE_RECIPES[(stageNum - 1) % STAGE_RECIPES.length];

  state.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
  state.tray = recipe.map((item, index) => ({
    slot: index,
    name: item.name,
    color: item.color,
    cells: normalizeCells(item.cells),
    placed: false,
    anchor: null
  }));

  state.stageMoves = 0;
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const state = {
    seed: safeSeed,
    stage: 1,
    maxStages: MAX_STAGES,
    maxMoves: MAX_MOVES_PER_STAGE,
    stageMoves: 0,
    totalMoves: 0,
    totalPlacements: 0,
    done: false,
    won: false,
    message: 'Organize all delicious bento ingredients neatly into the box.'
  };

  initStage(state, 1);
  return state;
}

function canPlace(grid, cells, x, y) {
  for (const c of cells) {
    const gx = x + c.dx;
    const gy = y + c.dy;
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) {
      return false;
    }
    if (grid[gy][gx] !== null) {
      return false;
    }
  }
  return true;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  let anyPlaced = false;

  for (const item of state.tray) {
    if (!item.placed) {
      // Rotation action
      actions.push(`rotate:${item.slot}`);

      // Placement actions across valid board coordinates
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (canPlace(state.grid, item.cells, x, y)) {
            actions.push(`place:${item.slot},${x},${y}`);
          }
        }
      }
    } else {
      anyPlaced = true;
      actions.push(`remove:${item.slot}`);
    }
  }

  if (anyPlaced) {
    actions.push('clear');
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    return { reward: 0, done: true };
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  state.stageMoves++;
  state.totalMoves++;

  if (action === 'clear') {
    // Remove all placed pieces back to tray
    for (const item of state.tray) {
      item.placed = false;
      item.anchor = null;
    }
    state.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    state.message = 'Cleared all items from bento box.';
  } else if (action.startsWith('rotate:')) {
    const slot = parseInt(action.slice(7), 10);
    const item = state.tray[slot];
    if (item && !item.placed) {
      item.cells = rotateCells(item.cells);
      state.message = `Rotated ${item.name}.`;
    }
  } else if (action.startsWith('remove:')) {
    const slot = parseInt(action.slice(7), 10);
    const item = state.tray[slot];
    if (item && item.placed && item.anchor) {
      for (const c of item.cells) {
        state.grid[item.anchor.y + c.dy][item.anchor.x + c.dx] = null;
      }
      item.placed = false;
      item.anchor = null;
      state.message = `Removed ${item.name} back to tray.`;
    }
  } else if (action.startsWith('place:')) {
    const parts = action.slice(6).split(',');
    const slot = parseInt(parts[0], 10);
    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    const item = state.tray[slot];

    if (item && !item.placed) {
      for (const c of item.cells) {
        state.grid[y + c.dy][x + c.dx] = { slot, name: item.name, color: item.color };
      }
      item.placed = true;
      item.anchor = { x, y };
      state.totalPlacements++;
      reward += item.cells.length * 5;
      state.message = `Placed ${item.name} into bento compartment.`;
    }
  }

  // Check stage completion
  const allPacked = state.tray.every(t => t.placed);
  if (allPacked) {
    if (state.stage < state.maxStages) {
      state.stage++;
      reward += 150;
      initStage(state, state.stage);
      state.message = `Bento #${state.stage - 1} packed perfectly! Preparing Bento #${state.stage}.`;
    } else {
      state.won = true;
      state.done = true;
      reward += 500;
      state.message = 'Victory! All bento boxes packed with masterful precision!';
    }
  } else if (state.stageMoves >= state.maxMoves) {
    state.done = true;
    reward -= 100;
    state.message = 'Kitchen rush ended! Ran out of time.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    (state.stage - 1) * 500 +
    state.totalPlacements * 25 +
    (state.won ? 500 : 0) -
    state.totalMoves
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GRID_SIZE,
    MAX_STAGES,
    MAX_MOVES_PER_STAGE,
    STAGE_RECIPES,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
