// Pure deterministic logic for 0060: Programming Puzzle (Robo Script)

const WIDTH = 8;
const HEIGHT = 8;
const MAX_STAGES = 3;
const MAX_COMMANDS = 10;
const MAX_RUNS = 25;

const OPCODES = ['forward', 'left', 'right', 'jump', 'light'];

// Facing: 0: North, 1: East, 2: South, 3: West
const FACING_DIRS = [
  { dx: 0, dy: -1 }, // 0: North
  { dx: 1, dy: 0 },  // 1: East
  { dx: 0, dy: 1 },  // 2: South
  { dx: -1, dy: 0 }  // 3: West
];

const STAGE_MAPS = [
  // Stage 1: Basic Traces and Turn
  [
    '########',
    '#@...L.#',
    '#......#',
    '#......#',
    '#....L.#',
    '#......#',
    '#......#',
    '########'
  ],
  // Stage 2: Jump across bus chasms
  [
    '########',
    '#@.W.L.#',
    '#......#',
    '#..W####',
    '#..W.L.#',
    '#......#',
    '#......#',
    '########'
  ],
  // Stage 3: Zig-zag algorithmic route
  [
    '########',
    '#@.L.W.#',
    '####.W.#',
    '#..W.L.#',
    '#.WW####',
    '#..W.L.#',
    '#......#',
    '########'
  ]
];

function parseMap(lines) {
  const grid = [];
  let startPos = { x: 1, y: 1 };
  let startFacing = 1; // East
  const nodes = [];

  for (let y = 0; y < HEIGHT; y++) {
    const row = [];
    const line = lines[y];
    for (let x = 0; x < WIDTH; x++) {
      const ch = line[x];
      if (ch === '@') {
        startPos = { x, y };
        row.push('.');
      } else if (ch === 'L') {
        nodes.push({ id: nodes.length, x, y, lit: false });
        row.push('.');
      } else if (ch === 'W' || ch === '#') {
        row.push(ch);
      } else {
        row.push('.');
      }
    }
    grid.push(row);
  }

  return { grid, startPos, startFacing, nodes };
}

function initStage(state, stageNum) {
  const parsed = parseMap(STAGE_MAPS[(stageNum - 1) % STAGE_MAPS.length]);
  state.grid = parsed.grid;
  state.startPos = { ...parsed.startPos };
  state.startFacing = parsed.startFacing;
  state.rover = { ...parsed.startPos, facing: parsed.startFacing };
  state.nodes = parsed.nodes.map(n => ({ ...n }));
  state.program = [];
  state.executionTrace = [];
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const state = {
    seed: safeSeed,
    stage: 1,
    maxStages: MAX_STAGES,
    maxCommands: MAX_COMMANDS,
    maxRuns: MAX_RUNS,
    runsUsed: 0,
    totalCommandsAdded: 0,
    nodesLitTotal: 0,
    done: false,
    won: false,
    message: 'Program the rover with commands, then execute Run to illuminate all memory nodes.'
  };

  initStage(state, 1);
  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Add commands if space available in buffer
  if (state.program.length < state.maxCommands) {
    for (const op of OPCODES) {
      actions.push(`add:${op}`);
    }
  }

  // Remove commands at index
  for (let i = 0; i < state.program.length; i++) {
    actions.push(`remove:${i}`);
  }

  // Clear buffer
  if (state.program.length > 0) {
    actions.push('clear');
    actions.push('run');
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
  state.totalActions = (state.totalActions || 0) + 1;

  if (action === 'clear') {
    state.program = [];
    state.message = 'Cleared instruction register.';
  } else if (action.startsWith('remove:')) {
    const idx = parseInt(action.slice(7), 10);
    state.program.splice(idx, 1);
    state.message = `Removed instruction at position #${idx + 1}.`;
  } else if (action.startsWith('add:')) {
    const op = action.slice(4);
    state.program.push(op);
    state.totalCommandsAdded++;
    state.message = `Appended [${op.toUpperCase()}] to program.`;
  } else if (action === 'run') {
    state.runsUsed++;
    // Execute program
    state.rover = { ...state.startPos, facing: state.startFacing };
    for (const n of state.nodes) {
      n.lit = false;
    }
    state.executionTrace = [{ ...state.rover, action: 'START' }];

    for (const op of state.program) {
      const delta = FACING_DIRS[state.rover.facing];

      if (op === 'forward') {
        const tx = state.rover.x + delta.dx;
        const ty = state.rover.y + delta.dy;
        if (tx >= 0 && tx < WIDTH && ty >= 0 && ty < HEIGHT && state.grid[ty][tx] !== '#') {
          if (state.grid[ty][tx] === 'W') {
            // Fell into chasm
            state.executionTrace.push({ x: tx, y: ty, facing: state.rover.facing, action: 'FALL' });
            break;
          } else {
            state.rover.x = tx;
            state.rover.y = ty;
          }
        }
      } else if (op === 'left') {
        state.rover.facing = (state.rover.facing + 3) % 4;
      } else if (op === 'right') {
        state.rover.facing = (state.rover.facing + 1) % 4;
      } else if (op === 'jump') {
        const tx = state.rover.x + delta.dx * 2;
        const ty = state.rover.y + delta.dy * 2;
        if (tx >= 0 && tx < WIDTH && ty >= 0 && ty < HEIGHT && state.grid[ty][tx] !== '#' && state.grid[ty][tx] !== 'W') {
          state.rover.x = tx;
          state.rover.y = ty;
        }
      } else if (op === 'light') {
        const node = state.nodes.find(n => n.x === state.rover.x && n.y === state.rover.y);
        if (node && !node.lit) {
          node.lit = true;
          state.nodesLitTotal++;
          reward += 30;
        }
      }

      state.executionTrace.push({ ...state.rover, action: op });
    }

    const allLit = state.nodes.every(n => n.lit);
    if (allLit) {
      if (state.stage < state.maxStages) {
        state.stage++;
        reward += 150;
        initStage(state, state.stage);
        state.message = `Circuit #${state.stage - 1} fully illuminated! Proceeding to Stage ${state.stage}.`;
      } else {
        state.won = true;
        state.done = true;
        reward += 500;
        state.message = 'Victory! All microchip memory cores fully programmed!';
      }
    } else {
      const litCount = state.nodes.filter(n => n.lit).length;
      if (state.runsUsed >= state.maxRuns) {
        state.done = true;
        reward -= 100;
        state.message = 'CPU overheated! Exceeded maximum program runs.';
      } else {
        state.message = `Execution complete. Illuminated ${litCount}/${state.nodes.length} nodes.`;
      }
    }
  }

  if (state.totalActions >= 150) {
    state.done = true;
    reward -= 50;
    state.message = 'Cycle timeout! Memory limit reached.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    (state.stage - 1) * 400 +
    state.nodesLitTotal * 50 +
    (state.won ? 500 : 0) -
    (state.runsUsed * 10 + state.program.length * 5)
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WIDTH,
    HEIGHT,
    MAX_STAGES,
    MAX_COMMANDS,
    MAX_RUNS,
    OPCODES,
    FACING_DIRS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
