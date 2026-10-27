// Pure deterministic logic for 0061: Hacking Puzzle (Cyber Breach)

const GRID_SIZE = 5;
const BUFFER_LIMIT = 5;
const MAX_STAGES = 3;
const MAX_LOCKOUTS = 3;

const BYTE_VOCAB = ['1C', 'BD', '55', 'E9', '7A', 'FF'];

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function containsSubsequence(buffer, seq) {
  if (seq.length > buffer.length) return false;
  for (let i = 0; i <= buffer.length - seq.length; i++) {
    let match = true;
    for (let j = 0; j < seq.length; j++) {
      if (buffer[i + j] !== seq[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

function initTier(state, stageNum) {
  const rng = createRng(state.seed + stageNum * 1337);

  // 1. Populate 5x5 matrix
  state.matrix = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const idx = Math.floor(rng() * BYTE_VOCAB.length);
      row.push(BYTE_VOCAB[idx]);
    }
    state.matrix.push(row);
  }

  // 2. Generate guaranteed solvable path of length 4
  // Start at row 0
  const path = [];
  let currR = 0;
  let currC = Math.floor(rng() * GRID_SIZE);
  path.push(state.matrix[currR][currC]);

  // Next: col currC, pick row r
  let nextR = (currR + 1 + Math.floor(rng() * (GRID_SIZE - 1))) % GRID_SIZE;
  path.push(state.matrix[nextR][currC]);

  // Next: row nextR, pick col c
  let nextC = (currC + 1 + Math.floor(rng() * (GRID_SIZE - 1))) % GRID_SIZE;
  path.push(state.matrix[nextR][nextC]);

  // Next: col nextC, pick row r2
  let r2 = (nextR + 1 + Math.floor(rng() * (GRID_SIZE - 1))) % GRID_SIZE;
  path.push(state.matrix[r2][nextC]);

  // 3. Define 2 Daemons based on the guaranteed path
  // Daemon 1: length 2
  // Daemon 2: length 2 or 3
  const d1Seq = [path[0], path[1]];
  const d2Seq = stageNum === 1 ? [path[2], path[3]] : [path[1], path[2], path[3]];

  state.daemons = [
    { id: 1, name: 'DATAMINE_V1', sequence: d1Seq, uploaded: false, reward: 40 },
    { id: 2, name: 'ICE_BREAKER', sequence: d2Seq, uploaded: false, reward: 60 }
  ];

  // 4. Reset execution state
  state.used = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  state.buffer = [];
  state.axis = 'row';
  state.activeLine = 0; // Row 0
  state.tierPicks = 0;
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const state = {
    seed: safeSeed,
    stage: 1,
    maxStages: MAX_STAGES,
    bufferLimit: BUFFER_LIMIT,
    maxLockouts: MAX_LOCKOUTS,
    lockouts: 0,
    totalPicks: 0,
    daemonsUploaded: 0,
    done: false,
    won: false,
    message: 'Access Granted: Row 0 active. Select bytes to construct daemon payloads.'
  };

  initTier(state, 1);
  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  if (state.axis === 'row') {
    const r = state.activeLine;
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!state.used[r][c]) {
        actions.push(`pick:${r},${c}`);
      }
    }
  } else {
    const c = state.activeLine;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!state.used[r][c]) {
        actions.push(`pick:${r},${c}`);
      }
    }
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
  state.totalPicks++;
  state.tierPicks++;

  const parts = action.slice(5).split(',');
  const r = parseInt(parts[0], 10);
  const c = parseInt(parts[1], 10);

  // Consume cell and push byte to buffer
  state.used[r][c] = true;
  const byte = state.matrix[r][c];
  state.buffer.push(byte);

  // Toggle alternating axis
  if (state.axis === 'row') {
    state.axis = 'col';
    state.activeLine = c;
    state.message = `Buffered [${byte}]. Column ${c} now active.`;
  } else {
    state.axis = 'row';
    state.activeLine = r;
    state.message = `Buffered [${byte}]. Row ${r} now active.`;
  }

  // Evaluate daemons
  for (const daemon of state.daemons) {
    if (!daemon.uploaded && containsSubsequence(state.buffer, daemon.sequence)) {
      daemon.uploaded = true;
      state.daemonsUploaded++;
      reward += daemon.reward;
      state.message = `DAEMON [${daemon.name}] INJECTED! (+${daemon.reward} pts)`;
    }
  }

  // Check tier completion
  const allUploaded = state.daemons.every(d => d.uploaded);
  if (allUploaded) {
    if (state.stage < state.maxStages) {
      state.stage++;
      reward += 150;
      initTier(state, state.stage);
      state.message = `ICE Layer #${state.stage - 1} shattered! Penetrating Layer #${state.stage}...`;
    } else {
      state.won = true;
      state.done = true;
      reward += 500;
      state.message = 'System Compromised! Neural Core breached successfully!';
    }
    return { reward, done: state.done };
  }

  // Check buffer limit / lockouts
  const movesRemaining = legalActions(state).length;
  if (state.buffer.length >= state.bufferLimit || movesRemaining === 0) {
    state.lockouts++;
    if (state.lockouts >= state.maxLockouts) {
      state.done = true;
      reward -= 100;
      state.message = 'NETWORK LOCKOUT! Subnet disconnected.';
    } else {
      reward -= 30;
      state.message = `Buffer full without full breach. Lockout warning (${state.lockouts}/${state.maxLockouts}). Resetting matrix.`;
      initTier(state, state.stage);
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
    state.daemonsUploaded * 60 +
    (state.won ? 500 : 0) -
    state.totalPicks * 5
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GRID_SIZE,
    BUFFER_LIMIT,
    MAX_STAGES,
    MAX_LOCKOUTS,
    BYTE_VOCAB,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
