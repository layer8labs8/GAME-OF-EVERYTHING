// Pure deterministic logic for 0066: Jigsaw (Stained Glass Jigsaw)

const MAX_STAGES = 3;
const MAX_MOVES_PER_STAGE = 45;

const STAGE_CONFIGS = [
  { stage: 1, name: 'Sunset Lighthouse', rows: 3, cols: 3 },
  { stage: 2, name: 'Emerald Dragon', rows: 3, cols: 4 },
  { stage: 3, name: 'Cosmic Nebula', rows: 4, cols: 4 }
];

// Color palette for stained-glass shards
const MOSAIC_PALETTES = [
  ['#f97316', '#fbbf24', '#0284c7', '#38bdf8', '#ef4444', '#f43f5e', '#8b5cf6', '#d97706', '#ec4899'],
  ['#10b981', '#059669', '#34d399', '#047857', '#06b6d4', '#0891b2', '#84cc16', '#65a30d', '#22c55e', '#15803d', '#14b8a6', '#0d9488'],
  ['#6366f1', '#4f46e5', '#8b5cf6', '#7c3aed', '#a855f7', '#9333ea', '#c084fc', '#e879f9', '#d946ef', '#ec4899', '#db2777', '#f43f5e', '#06b6d4', '#38bdf8', '#0284c7', '#2563eb']
];

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generatePieces(rows, cols, seed, palette) {
  const rng = createRng(seed);

  // Generate internal horizontal edges: (rows) x (cols - 1)
  const hEdges = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols - 1; c++) {
      row.push(rng() > 0.5 ? 1 : -1);
    }
    hEdges.push(row);
  }

  // Generate internal vertical edges: (rows - 1) x (cols)
  const vEdges = [];
  for (let r = 0; r < rows - 1; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(rng() > 0.5 ? 1 : -1);
    }
    vEdges.push(row);
  }

  const pieces = [];
  let id = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const top = (r === 0) ? 0 : -vEdges[r - 1][c];
      const bottom = (r === rows - 1) ? 0 : vEdges[r][c];
      const left = (c === 0) ? 0 : -hEdges[r][c - 1];
      const right = (c === cols - 1) ? 0 : hEdges[r][c];

      pieces.push({
        id,
        targetRow: r,
        targetCol: c,
        edges: { top, right, bottom, left },
        color: palette[id % palette.length],
        placed: false,
        placedRow: null,
        placedCol: null
      });
      id++;
    }
  }

  // Shuffle tray pieces deterministically using Fisher-Yates
  const tray = pieces.map(p => ({ ...p }));
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = tray[i];
    tray[i] = tray[j];
    tray[j] = tmp;
  }

  return { pieces, tray };
}

function initStage(state, stageNum) {
  const cfg = STAGE_CONFIGS[(stageNum - 1) % STAGE_CONFIGS.length];
  state.rows = cfg.rows;
  state.cols = cfg.cols;
  state.themeName = cfg.name;
  state.board = Array(cfg.rows).fill(null).map(() => Array(cfg.cols).fill(null));

  const palette = MOSAIC_PALETTES[(stageNum - 1) % MOSAIC_PALETTES.length];
  const gen = generatePieces(cfg.rows, cfg.cols, state.seed + stageNum * 999, palette);
  state.tray = gen.tray;
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
    correctPlacements: 0,
    done: false,
    won: false,
    message: 'Assemble interlocking stained-glass pieces into the mosaic frame.'
  };

  initStage(state, 1);
  return state;
}

function canPlace(board, piece, r, c, rows, cols) {
  if (board[r][c] !== null) return false;

  // Top edge check
  if (r === 0) {
    if (piece.edges.top !== 0) return false;
  } else if (board[r - 1][c] !== null) {
    if (piece.edges.top + board[r - 1][c].edges.bottom !== 0) return false;
  }

  // Bottom edge check
  if (r === rows - 1) {
    if (piece.edges.bottom !== 0) return false;
  } else if (board[r + 1][c] !== null) {
    if (piece.edges.bottom + board[r + 1][c].edges.top !== 0) return false;
  }

  // Left edge check
  if (c === 0) {
    if (piece.edges.left !== 0) return false;
  } else if (board[r][c - 1] !== null) {
    if (piece.edges.left + board[r][c - 1].edges.right !== 0) return false;
  }

  // Right edge check
  if (c === cols - 1) {
    if (piece.edges.right !== 0) return false;
  } else if (board[r][c + 1] !== null) {
    if (piece.edges.right + board[r][c + 1].edges.left !== 0) return false;
  }

  return true;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  let anyPlaced = false;

  for (const piece of state.tray) {
    if (!piece.placed) {
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          if (canPlace(state.board, piece, r, c, state.rows, state.cols)) {
            actions.push(`place:${piece.id},${r},${c}`);
          }
        }
      }
    }
  }

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.board[r][c] !== null) {
        anyPlaced = true;
        actions.push(`remove:${r},${c}`);
      }
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
    for (const piece of state.tray) {
      piece.placed = false;
      piece.placedRow = null;
      piece.placedCol = null;
    }
    state.board = Array(state.rows).fill(null).map(() => Array(state.cols).fill(null));
    state.message = 'Cleared mosaic frame back to tray.';
  } else if (action.startsWith('remove:')) {
    const parts = action.slice(7).split(',');
    const r = parseInt(parts[0], 10);
    const c = parseInt(parts[1], 10);
    const piece = state.board[r][c];
    if (piece) {
      const trayItem = state.tray.find(p => p.id === piece.id);
      if (trayItem) {
        trayItem.placed = false;
        trayItem.placedRow = null;
        trayItem.placedCol = null;
      }
      state.board[r][c] = null;
      state.message = `Removed piece #${piece.id + 1} back to tray.`;
    }
  } else if (action.startsWith('place:')) {
    const parts = action.slice(6).split(',');
    const id = parseInt(parts[0], 10);
    const r = parseInt(parts[1], 10);
    const c = parseInt(parts[2], 10);

    const piece = state.tray.find(p => p.id === id);
    if (piece && !piece.placed) {
      piece.placed = true;
      piece.placedRow = r;
      piece.placedCol = c;
      state.board[r][c] = piece;

      const isCorrect = (piece.targetRow === r && piece.targetCol === c);
      if (isCorrect) {
        state.correctPlacements++;
        reward += 30;
      } else {
        reward += 10;
      }
      state.message = `Fitted piece #${id + 1} at (${r + 1}, ${c + 1}).`;
    }
  }

  // Check stage completion
  const allPlaced = state.tray.every(p => p.placed);
  if (allPlaced) {
    if (state.stage < state.maxStages) {
      state.stage++;
      reward += 150;
      initStage(state, state.stage);
      state.message = `Mosaic #${state.stage - 1} assembled! Advancing to ${state.themeName}.`;
    } else {
      state.won = true;
      state.done = true;
      reward += 500;
      state.message = 'Masterpiece Complete! All stained-glass mosaics assembled!';
    }
  } else if (state.stageMoves >= state.maxMoves) {
    state.done = true;
    reward -= 100;
    state.message = 'Artisan fatigue! Move budget depleted.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    (state.stage - 1) * 500 +
    state.correctPlacements * 30 +
    (state.won ? 500 : 0) -
    state.totalMoves
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STAGE_CONFIGS,
    MAX_STAGES,
    MAX_MOVES_PER_STAGE,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
