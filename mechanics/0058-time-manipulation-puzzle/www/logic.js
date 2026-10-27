// Pure deterministic logic for 0058: Time Manipulation Puzzle (Chronos Paradox)

const WIDTH = 8;
const HEIGHT = 8;
const MAX_STAGES = 3;
const MAX_TICKS_PER_LOOP = 24;
const MAX_REWINDS = 12;
const MAX_CLONES = 2;

const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  wait: { dx: 0, dy: 0 }
};

const CHAMBERS = [
  // Chamber 1: Single Gate & Single Echo
  [
    '########',
    '#@.#...#',
    '#..#...#',
    '#..#...#',
    '#..1...#',
    '#P.#####',
    '#.....X#',
    '########'
  ],
  // Chamber 2: Dual Gate Temporal Relay
  [
    '########',
    '#@...P2#',
    '#..#1###',
    '#P1#...#',
    '####2###',
    '#......#',
    '#.....X#',
    '########'
  ],
  // Chamber 3: Paradox Labyrinth & Chrono Orbs
  [
    '########',
    '#@.O#..#',
    '#P1.#..#',
    '###1##2#',
    '#..O#..#',
    '#.P2#..#',
    '#.....X#',
    '########'
  ]
];

function parseChamber(lines) {
  const grid = [];
  let player = { x: 1, y: 1 };
  let exit = { x: 6, y: 6 };
  const plates = [];
  const gates = [];
  const orbs = [];

  for (let y = 0; y < HEIGHT; y++) {
    const row = [];
    const line = lines[y];
    for (let x = 0; x < WIDTH; x++) {
      const ch = line[x];
      if (ch === '@') {
        player = { x, y };
        row.push('.');
      } else if (ch === 'X') {
        exit = { x, y };
        row.push('X');
      } else if (ch === 'P') {
        plates.push({ id: 1, x, y });
        row.push('.');
      } else if (ch === '1' && line[x - 1] === 'P') {
        // P1 handled
      } else if (ch === '2' && line[x - 1] === 'P') {
        // P2 handled
      } else if (ch === 'O') {
        orbs.push({ x, y });
        row.push('.');
      } else if (ch === '1') {
        gates.push({ id: 1, x, y, open: false });
        row.push('G1');
      } else if (ch === '2') {
        gates.push({ id: 2, x, y, open: false });
        row.push('G2');
      } else if (ch === '#') {
        row.push('#');
      } else {
        row.push('.');
      }
    }
    grid.push(row);
  }

  // Parse multi-character plate IDs if present in blueprint
  for (let y = 0; y < HEIGHT; y++) {
    const line = lines[y];
    for (let x = 0; x < WIDTH; x++) {
      if (line[x] === 'P' && x + 1 < WIDTH && (line[x + 1] === '1' || line[x + 1] === '2')) {
        const id = parseInt(line[x + 1], 10);
        const existing = plates.find(p => p.x === x && p.y === y);
        if (existing) existing.id = id;
        else plates.push({ id, x, y });
      }
    }
  }

  return { grid, player, exit, plates, gates, orbs };
}

function evaluateGates(state) {
  // Check if plate 1 is occupied by player or any clone
  const occupiedPlates = new Set();
  for (const plate of state.plates) {
    if (state.player.x === plate.x && state.player.y === plate.y) {
      occupiedPlates.add(plate.id);
    }
    for (const clonePos of state.clonePositions) {
      if (clonePos.x === plate.x && clonePos.y === plate.y) {
        occupiedPlates.add(plate.id);
      }
    }
  }

  for (const gate of state.gates) {
    gate.open = occupiedPlates.has(gate.id);
  }
}

function initChamber(state, stageNum) {
  const parsed = parseChamber(CHAMBERS[(stageNum - 1) % CHAMBERS.length]);
  state.grid = parsed.grid;
  state.startPos = { ...parsed.player };
  state.player = { ...parsed.player };
  state.exit = { ...parsed.exit };
  state.plates = parsed.plates.map(p => ({ ...p }));
  state.gates = parsed.gates.map(g => ({ ...g }));
  state.orbs = parsed.orbs.map(o => ({ ...o }));

  state.clones = []; // array of recordings
  state.clonePositions = [];
  state.currentRecording = [];
  state.tick = 0;
  evaluateGates(state);
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const state = {
    seed: safeSeed,
    stage: 1,
    maxStages: MAX_STAGES,
    maxTicksPerLoop: MAX_TICKS_PER_LOOP,
    maxRewinds: MAX_REWINDS,
    rewindsUsed: 0,
    tick: 0,
    totalTicks: 0,
    orbsCollected: 0,
    done: false,
    won: false,
    message: 'Record your timeline. Step on plates and rewind to synchronize with past echoes.'
  };

  initChamber(state, 1);
  return state;
}

function isTileBlocked(state, tx, ty) {
  if (tx < 0 || tx >= WIDTH || ty < 0 || ty >= HEIGHT) return true;
  if (state.grid[ty][tx] === '#') return true;

  // Check gate obstruction
  for (const gate of state.gates) {
    if (gate.x === tx && gate.y === ty && !gate.open) {
      return true;
    }
  }
  return false;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = ['wait'];

  // Movement directions
  for (const [dirName, delta] of Object.entries(DIRS)) {
    if (dirName === 'wait') continue;
    const tx = state.player.x + delta.dx;
    const ty = state.player.y + delta.dy;
    if (!isTileBlocked(state, tx, ty)) {
      actions.push(dirName);
    }
  }

  // Rewind action legal if current timeline has recorded steps and rewinds remain
  if (state.rewindsUsed < state.maxRewinds && state.currentRecording.length > 0) {
    actions.push('rewind');
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

  if (action === 'rewind') {
    state.rewindsUsed++;
    // Save recording as new echo clone
    if (state.clones.length >= MAX_CLONES) {
      state.clones.shift();
    }
    state.clones.push([...state.currentRecording]);

    // Reset loop
    state.tick = 0;
    state.player = { ...state.startPos };
    state.clonePositions = state.clones.map(() => ({ ...state.startPos }));
    state.currentRecording = [];
    evaluateGates(state);
    state.message = `Timeline collapsed! Echo Clone #${state.clones.length} spawned.`;
    return { reward: 0, done: false };
  }

  // Normal action (movement or wait)
  state.totalTicks++;
  state.tick++;
  state.currentRecording.push(action);

  // 1. Move Player
  const delta = DIRS[action];
  state.player.x += delta.dx;
  state.player.y += delta.dy;

  // 2. Advance Echo Clones
  for (let i = 0; i < state.clones.length; i++) {
    const cloneRec = state.clones[i];
    const pastAction = cloneRec[state.tick - 1];
    if (pastAction && DIRS[pastAction]) {
      const cDelta = DIRS[pastAction];
      const cx = state.clonePositions[i].x + cDelta.dx;
      const cy = state.clonePositions[i].y + cDelta.dy;
      // Echo clones follow their recorded path
      if (cx >= 0 && cx < WIDTH && cy >= 0 && cy < HEIGHT && state.grid[cy][cx] !== '#') {
        state.clonePositions[i].x = cx;
        state.clonePositions[i].y = cy;
      }
    }
  }

  // 3. Evaluate Gates after movement
  evaluateGates(state);

  // 4. Collect Orbs
  const orbIdx = state.orbs.findIndex(o => o.x === state.player.x && o.y === state.player.y);
  if (orbIdx !== -1) {
    state.orbs.splice(orbIdx, 1);
    state.orbsCollected++;
    reward += 25;
    state.message = 'Chrono Orb collected! (+25 pts)';
  }

  // 5. Check Chamber Exit
  if (state.player.x === state.exit.x && state.player.y === state.exit.y) {
    if (state.stage < state.maxStages) {
      state.stage++;
      reward += 150;
      initChamber(state, state.stage);
      state.message = `Paradox resolved! Proceeding to Chamber ${state.stage}.`;
    } else {
      state.won = true;
      state.done = true;
      reward += 400;
      state.message = 'Victory! Chrono anomaly stabilized!';
    }
    return { reward, done: state.done };
  }

  // 6. Check Loop Expiry
  if (state.tick >= state.maxTicksPerLoop) {
    if (state.rewindsUsed < state.maxRewinds) {
      // Automatic collapse into rewind
      state.rewindsUsed++;
      if (state.clones.length >= MAX_CLONES) state.clones.shift();
      state.clones.push([...state.currentRecording]);
      state.tick = 0;
      state.player = { ...state.startPos };
      state.clonePositions = state.clones.map(() => ({ ...state.startPos }));
      state.currentRecording = [];
      evaluateGates(state);
      state.message = 'Timeline limit reached. Auto-rewound into new Echo.';
    } else {
      state.done = true;
      reward -= 100;
      state.message = 'Temporal collapse! Ran out of rewinds.';
    }
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    (state.stage - 1) * 400 +
    state.orbsCollected * 50 +
    (state.won ? 500 : 0) -
    state.totalTicks
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WIDTH,
    HEIGHT,
    MAX_STAGES,
    MAX_TICKS_PER_LOOP,
    MAX_REWINDS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
