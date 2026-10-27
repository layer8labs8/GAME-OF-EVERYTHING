// Pure deterministic logic for 0056: Hex Grid Puzzle (Hexa Conduits)

const TOTAL_TILES = 19;
const MAX_STAGES = 3;
const MAX_ROTATIONS_PER_STAGE = 50;

// Hex directions in axial coordinates:
// 0: East (+1, 0)
// 1: Southeast (0, +1)
// 2: Southwest (-1, +1)
// 3: West (-1, 0)
// 4: Northwest (0, -1)
// 5: Northeast (+1, -1)
const DIRS = [
  { dq: 1, dr: 0 },
  { dq: 0, dr: 1 },
  { dq: -1, dr: 1 },
  { dq: -1, dr: 0 },
  { dq: 0, dr: -1 },
  { dq: 1, dr: -1 }
];

const HEX_COORDS = [
  { id: 0, q: 0, r: 0 },   // Core
  { id: 1, q: 1, r: 0 },
  { id: 2, q: 0, r: 1 },
  { id: 3, q: -1, r: 1 },
  { id: 4, q: -1, r: 0 },
  { id: 5, q: 0, r: -1 },
  { id: 6, q: 1, r: -1 },
  { id: 7, q: 2, r: 0 },
  { id: 8, q: 1, r: 1 },
  { id: 9, q: 0, r: 2 },
  { id: 10, q: -1, r: 2 },
  { id: 11, q: -2, r: 2 },
  { id: 12, q: -2, r: 1 },
  { id: 13, q: -2, r: 0 },
  { id: 14, q: -1, r: -1 },
  { id: 15, q: 0, r: -2 },
  { id: 16, q: 1, r: -2 },
  { id: 17, q: 2, r: -2 },
  { id: 18, q: 2, r: -1 }
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

function findTileIndex(q, r) {
  return HEX_COORDS.findIndex(h => h.q === q && h.r === r);
}

// Predefined balanced circuit topologies for stages 1, 2, 3
// Each circuit specifies base connections (at rotation = 0)
const STAGE_CONFIGS = [
  {
    // Stage 1: 3 Relays (Tiles 7, 11, 15)
    relays: [7, 11, 15],
    // Base wires for each tile when solved
    baseWires: {
      0: [0, 2, 4],     // Core connects to 1, 3, 5
      1: [0, 3],        // 1 connects to 0 and 7
      3: [2, 5],        // 3 connects to 0 and 11
      5: [4, 1],        // 5 connects to 0 and 15
      7: [3],           // Relay 7 at (2,0): receives from 1 (dir 3 is -1,0 -> 1,0)
      11: [5],          // Relay 11 at (-2,2): receives from 3 (dir 5 is +1,-1 -> -1,1)
      15: [1],          // Relay 15 at (0,-2): receives from 5 (dir 1 is 0,+1 -> 0,-1)
      // Filler conduits
      2: [0, 3],
      4: [1, 4],
      6: [2, 5],
      8: [0, 1],
      9: [2, 3],
      10: [4, 5],
      12: [0, 2],
      13: [1, 3],
      14: [2, 4],
      16: [3, 5],
      17: [0, 4],
      18: [1, 5]
    }
  },
  {
    // Stage 2: 4 Relays (Tiles 7, 9, 13, 16)
    relays: [7, 9, 13, 16],
    baseWires: {
      0: [0, 1, 3, 5],  // Core connects to 1, 2, 4, 6
      1: [0, 3],        // 1 at (1,0) connects to 0 and 7 (2,0)
      2: [1, 4],        // 2 at (0,1) connects to 0 and 9 (0,2)
      4: [3, 0],        // 4 at (-1,0) connects to 0 and 13 (-2,0)
      6: [4, 2],        // 6 at (1,-1): dir 4 is (1,-2) which is 16; dir 2 is (0,0) which is 0
      7: [3],
      9: [4],
      13: [0],
      16: [1],
      // Filler conduits
      3: [0, 2, 4],
      5: [1, 3, 5],
      8: [0, 2],
      10: [1, 3],
      11: [2, 4],
      12: [3, 5],
      14: [0, 4],
      15: [1, 5],
      17: [0, 3],
      18: [2, 5]
    }
  },
  {
    // Stage 3: 5 Relays (Tiles 7, 9, 11, 13, 15)
    relays: [7, 9, 11, 13, 15],
    baseWires: {
      0: [0, 1, 2, 3, 4], // Core connects to 1, 2, 3, 4, 5
      1: [0, 3],          // to 7
      2: [1, 4],          // to 9
      3: [2, 5],          // to 11
      4: [3, 0],          // to 13
      5: [4, 1],          // to 15
      7: [3],
      9: [4],
      11: [5],
      13: [0],
      15: [1],
      // Filler conduits
      6: [2, 5],
      8: [0, 2],
      10: [1, 3],
      12: [2, 4],
      14: [3, 5],
      16: [0, 4],
      17: [1, 5],
      18: [0, 3]
    }
  }
];

function getEffectiveWires(tile) {
  return tile.baseWires.map(w => (w + tile.rotation) % 6);
}

function updatePowerGrid(state) {
  // Reset power
  for (const t of state.tiles) {
    t.isPowered = false;
  }

  // Core is always powered
  const core = state.tiles[0];
  core.isPowered = true;

  const queue = [core];
  const visited = new Set([0]);

  while (queue.length > 0) {
    const curr = queue.shift();
    const currWires = getEffectiveWires(curr);

    for (const dir of currWires) {
      const delta = DIRS[dir];
      const nq = curr.q + delta.dq;
      const nr = curr.r + delta.dr;
      const nIdx = findTileIndex(nq, nr);

      if (nIdx !== -1 && !visited.has(nIdx)) {
        const neighbor = state.tiles[nIdx];
        const nWires = getEffectiveWires(neighbor);
        const requiredReturnDir = (dir + 3) % 6;

        if (nWires.includes(requiredReturnDir)) {
          neighbor.isPowered = true;
          visited.add(nIdx);
          queue.push(neighbor);
        }
      }
    }
  }

  // Count powered relays
  state.poweredRelays = state.tiles.filter(t => t.type === 'relay' && t.isPowered).length;
}

function initStage(state, stageNum) {
  const cfg = STAGE_CONFIGS[(stageNum - 1) % STAGE_CONFIGS.length];
  const rng = createRng(state.seed + stageNum * 77);

  state.tiles = HEX_COORDS.map(coord => {
    const isCore = coord.id === 0;
    const isRelay = cfg.relays.includes(coord.id);
    const base = cfg.baseWires[coord.id] || [0, 3];

    // Core cannot rotate, others scrambled randomly between 1 and 5 (guaranteeing not solved at start)
    const scramble = isCore ? 0 : Math.floor(rng() * 5) + 1;

    return {
      id: coord.id,
      q: coord.q,
      r: coord.r,
      type: isCore ? 'core' : (isRelay ? 'relay' : 'conduit'),
      baseWires: [...base],
      rotation: scramble,
      isPowered: false,
      isLocked: isCore
    };
  });

  state.targetRelays = cfg.relays.length;
  state.stageRotations = 0;
  updatePowerGrid(state);
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const state = {
    seed: safeSeed,
    stage: 1,
    maxStages: MAX_STAGES,
    maxRotationsPerStage: MAX_ROTATIONS_PER_STAGE,
    rotations: 0,
    totalRotations: 0,
    poweredRelays: 0,
    targetRelays: 3,
    done: false,
    won: false,
    message: 'Channel plasma from Core to all peripheral Relays.'
  };

  initStage(state, 1);
  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = ['wait'];
  // All rotatable tiles (exclude locked core at id 0)
  for (let i = 1; i < TOTAL_TILES; i++) {
    actions.push(`rotate:${i}`);
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
  state.totalRotations++;
  state.stageRotations++;

  const prevPowered = state.poweredRelays;
  if (action !== 'wait') {
    const tileId = parseInt(action.slice(7), 10);
    const tile = state.tiles.find(t => t.id === tileId);
    if (tile && !tile.isLocked) {
      tile.rotation = (tile.rotation + 1) % 6;
    }
  } else {
    state.message = 'Analyzer standby.';
  }

  updatePowerGrid(state);
  const delta = state.poweredRelays - prevPowered;
  reward += delta * 20;

  if (delta > 0) {
    state.message = `Relay illuminated! (${state.poweredRelays}/${state.targetRelays})`;
  } else if (action !== 'wait') {
    state.message = `Rotated conduit #${action.slice(7)}.`;
  }

  // Check stage completion
  if (state.poweredRelays === state.targetRelays) {
    if (state.stage < state.maxStages) {
      state.stage++;
      reward += 150;
      initStage(state, state.stage);
      state.message = `Grid synchronized! Advancing to Stage ${state.stage}.`;
    } else {
      state.won = true;
      state.done = true;
      reward += 400;
      state.message = 'Victory! All energy relays fully synchronized!';
    }
  } else if (state.stageRotations >= state.maxRotationsPerStage) {
    state.done = true;
    reward -= 100;
    state.message = 'Power Surge! Circuit overheated.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    (state.stage - 1) * 400 +
    state.poweredRelays * 60 +
    (state.won ? 600 : 0) -
    state.totalRotations * 2
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TOTAL_TILES,
    MAX_STAGES,
    MAX_ROTATIONS_PER_STAGE,
    HEX_COORDS,
    DIRS,
    createState,
    legalActions,
    step,
    isOver,
    score,
    initStage
  };
}
