// Pure deterministic simulation logic for 0102-base-building (Outpost Constructor)

const MAX_TURNS = 25;
const ROWS = 5;
const COLS = 5;

const BUILDING_COSTS = {
  solar: 20,
  drill: 25,
  biodome: 30,
  turret: 35,
  reactor: 50,
  conduit: 5,
  uplink: 80
};

const BUILDING_POWER = {
  command: { gen: 20, draw: 0 },
  solar: { gen: 15, draw: 0 },
  drill: { gen: 0, draw: 3 },
  biodome: { gen: 0, draw: 5 },
  turret: { gen: 0, draw: 6 },
  reactor: { gen: 40, draw: 0 },
  conduit: { gen: 0, draw: 0 },
  uplink: { gen: 0, draw: 25 }
};

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 12345) {
  const numSeed = typeof seed === 'number' ? seed : 12345;

  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      let deposit = 'bedrock';
      if ((r === 0 && c === 1) || (r === 0 && c === 3) || (r === 4 && c === 0) || (r === 4 && c === 4)) {
        deposit = 'mineral_vein';
      } else if ((r === 1 && c === 4) || (r === 3 && c === 0)) {
        deposit = 'geothermal_vent';
      }

      row.push({
        r,
        c,
        deposit,
        building: null
      });
    }
    grid.push(row);
  }

  // Central Command Core initialized at (2, 2)
  grid[2][2].building = {
    type: 'command',
    tier: 1,
    hp: 100,
    maxHp: 100,
    connected: true
  };

  const state = {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    minerals: 60,
    powerGen: 20,
    powerDraw: 0,
    powerSurplus: 20,
    brownout: false,
    colonists: 10,
    threatWaveTurn: 5,
    uplinkPoweredTurns: 0,
    grid,
    history: ['Outpost command core operational on Sector 7. Establish power grid and mineral extractors.'],
    winner: null,
    result: null,
    done: false
  };

  updatePowerGrid(state);
  return state;
}

function getRngValue(state) {
  state.rngStep = (state.rngStep + 1) | 0;
  const rng = createRng(state.seed + state.rngStep);
  return rng();
}

function updatePowerGrid(state) {
  // BFS from Command Core and Power generators to find connected modules
  const connected = new Set();
  const queue = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = state.grid[r][c].building;
      if (b && (b.type === 'command' || b.type === 'solar' || b.type === 'reactor')) {
        connected.add(`${r},${c}`);
        queue.push({ r, c });
      }
    }
  }

  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];

  while (queue.length > 0) {
    const cur = queue.shift();
    for (let i = 0; i < 4; i++) {
      const nr = cur.r + dr[i];
      const nc = cur.c + dc[i];
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        const key = `${nr},${nc}`;
        const nb = state.grid[nr][nc].building;
        if (nb && !connected.has(key)) {
          connected.add(key);
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  let totalGen = 0;
  let totalDraw = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = state.grid[r][c].building;
      if (b) {
        b.connected = connected.has(`${r},${c}`);
        if (b.connected && b.hp > 0) {
          const spec = BUILDING_POWER[b.type];
          const tierMult = 1 + (b.tier - 1) * 0.5;
          totalGen += Math.floor(spec.gen * tierMult);
          totalDraw += Math.floor(spec.draw * tierMult);
        }
      }
    }
  }

  state.powerGen = totalGen;
  state.powerDraw = totalDraw;
  state.powerSurplus = totalGen - totalDraw;
  state.brownout = (totalDraw > totalGen);
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const minerals = state.minerals;

  // Find all constructible tiles (adjacent to an existing connected building)
  const constructibleTiles = [];
  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[r][c];
      if (!cell.building) {
        // Must be adjacent to an existing connected building
        let adjacent = false;
        for (let i = 0; i < 4; i++) {
          const nr = r + dr[i];
          const nc = c + dc[i];
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (state.grid[nr][nc].building && state.grid[nr][nc].building.connected) {
              adjacent = true;
              break;
            }
          }
        }
        if (adjacent) constructibleTiles.push({ r, c, deposit: cell.deposit });
      }
    }
  }

  // Build options
  constructibleTiles.forEach(tile => {
    // Solar Array
    if (minerals >= BUILDING_COSTS.solar) actions.push(`build:solar:${tile.r},${tile.c}`);
    // Mineral Drill
    if (minerals >= BUILDING_COSTS.drill) actions.push(`build:drill:${tile.r},${tile.c}`);
    // Hydroponic Biodome
    if (minerals >= BUILDING_COSTS.biodome) actions.push(`build:biodome:${tile.r},${tile.c}`);
    // Laser Turret
    if (minerals >= BUILDING_COSTS.turret) actions.push(`build:turret:${tile.r},${tile.c}`);
    // Power Conduit
    if (minerals >= BUILDING_COSTS.conduit) actions.push(`build:conduit:${tile.r},${tile.c}`);
    // Reactor (only on or adjacent to geothermal vent)
    if (minerals >= BUILDING_COSTS.reactor && tile.deposit === 'geothermal_vent') {
      actions.push(`build:reactor:${tile.r},${tile.c}`);
    }
    // Orbital Uplink
    if (minerals >= BUILDING_COSTS.uplink) actions.push(`build:uplink:${tile.r},${tile.c}`);
  });

  // Repair damaged buildings
  if (minerals >= 10) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const b = state.grid[r][c].building;
        if (b && b.hp < b.maxHp) {
          actions.push(`repair:${r},${c}`);
        }
      }
    }
  }

  // Upgrade building tier
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = state.grid[r][c].building;
      if (b && b.tier === 1 && b.type !== 'conduit') {
        const upCost = Math.floor(BUILDING_COSTS[b.type] * 0.8) || 30;
        if (minerals >= upCost) {
          actions.push(`upgrade:${r},${c}`);
        }
      }
    }
  }

  // Always can advance operational cycle
  actions.push('wait');

  return actions;
}

function processTurnEconomy(state) {
  updatePowerGrid(state);

  // 1. Mineral Income
  let minIncome = 5; // Base passive income
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[r][c];
      const b = cell.building;
      if (b && b.type === 'drill' && b.connected && !state.brownout && b.hp > 0) {
        let yieldRate = 12;
        if (cell.deposit === 'mineral_vein') yieldRate = 22;
        minIncome += Math.floor(yieldRate * (1 + (b.tier - 1) * 0.5));
      }
    }
  }
  state.minerals += minIncome;

  // 2. Colonists & Life Support
  let capacity = 10;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = state.grid[r][c].building;
      if (b && b.type === 'biodome' && b.connected && !state.brownout && b.hp > 0) {
        capacity += Math.floor(15 * (1 + (b.tier - 1) * 0.5));
      }
    }
  }

  if (state.brownout) {
    // Lack of life support causes casualties
    const loss = 2;
    state.colonists = Math.max(0, state.colonists - loss);
    state.history.push(`BROWNOUT ALERT! Life support failed, losing ${loss} colonists!`);
  } else if (state.colonists < capacity) {
    state.colonists = Math.min(capacity, state.colonists + 2);
  }

  // 3. Uplink power check
  let hasPoweredUplink = false;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = state.grid[r][c].building;
      if (b && b.type === 'uplink' && b.connected && !state.brownout && b.hp > 0) {
        hasPoweredUplink = true;
      }
    }
  }

  if (hasPoweredUplink) {
    state.uplinkPoweredTurns += 1;
    state.history.push(`Orbital Uplink beacon active! Broadcast progress: ${state.uplinkPoweredTurns}/3 cycles.`);
  } else {
    state.uplinkPoweredTurns = 0;
  }

  // 4. Hostile Threat Waves
  if (state.turn % 5 === 0) {
    resolveThreatWave(state);
  }
}

function resolveThreatWave(state) {
  const waveNumber = Math.floor(state.turn / 5);
  let swarmHealth = waveNumber * 50;

  state.history.push(`WARNING: Hostile Alien Swarm detected! Swarm Strength: ${swarmHealth}.`);

  // Active turrets fire defense salvos
  let totalTurretDmg = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = state.grid[r][c].building;
      if (b && b.type === 'turret' && b.connected && !state.brownout && b.hp > 0) {
        totalTurretDmg += Math.floor(35 * (1 + (b.tier - 1) * 0.5));
      }
    }
  }

  swarmHealth = Math.max(0, swarmHealth - totalTurretDmg);

  if (swarmHealth <= 0) {
    state.history.push(`Perimeter defense turrets obliterated the hostile swarm! (Inflicted ${totalTurretDmg} damage).`);
  } else {
    // Remaining swarm breaches defenses and damages perimeter modules
    state.history.push(`Defenses overwhelmed! Alien swarm breached perimeter dealing ${swarmHealth} structural damage.`);
    let remainingDmg = swarmHealth;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const b = state.grid[r][c].building;
        if (b && b.hp > 0 && remainingDmg > 0) {
          const dmg = Math.min(b.hp, remainingDmg);
          b.hp -= dmg;
          remainingDmg -= dmg;
          if (b.hp <= 0) {
            state.history.push(`ALERT: ${b.type.toUpperCase()} module at (${r}, ${c}) was destroyed!`);
          }
        }
      }
    }
  }
}

function evaluateGameOutcome(state) {
  const cmd = state.grid[2][2].building;

  // Defeat 1: Command Core destroyed
  if (!cmd || cmd.hp <= 0) {
    state.done = true;
    state.winner = 'threat';
    state.result = 'command_destroyed';
    state.history.push('MISSION FAILED! Outpost Command Core suffered catastrophic destruction.');
    return;
  }

  // Defeat 2: All colonists lost
  if (state.colonists <= 0) {
    state.done = true;
    state.winner = 'threat';
    state.result = 'population_extinct';
    state.history.push('MISSION FAILED! All outpost personnel perished from environmental exposure.');
    return;
  }

  // Victory: Uplink powered for 3 consecutive cycles OR survived past turn 20 with active uplink
  if (state.uplinkPoweredTurns >= 3 || (state.turn >= 20 && state.uplinkPoweredTurns >= 1)) {
    state.done = true;
    state.winner = 'player';
    state.result = 'uplink_established';
    state.history.push('MISSION ACCOMPLISHED! Earth Command has locked onto the Orbital Uplink.');
    return;
  }

  if (state.turn >= state.maxTurns) {
    state.done = true;
    if (cmd.hp > 50 && state.colonists >= 15) {
      state.winner = 'player';
      state.result = 'frontier_mastery';
      state.history.push('SURVIVAL VICTORY! Outpost fortified and secured as an enduring colony.');
    } else {
      state.winner = 'threat';
      state.result = 'colony_abandoned';
      state.history.push('MISSION FAILED! Outpost failed to achieve operational sustainability.');
    }
  }
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const valid = legalActions(state);
  if (!valid.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;

  if (action.startsWith('build:')) {
    const parts = action.split(':');
    const type = parts[1];
    const coords = parts[2].split(',').map(Number);
    const r = coords[0];
    const c = coords[1];

    const cost = BUILDING_COSTS[type];
    state.minerals -= cost;

    const cell = state.grid[r][c];
    cell.building = {
      type,
      tier: 1,
      hp: type === 'command' ? 100 : (type === 'uplink' ? 100 : (type === 'turret' ? 70 : 50)),
      maxHp: type === 'command' ? 100 : (type === 'uplink' ? 100 : (type === 'turret' ? 70 : 50)),
      connected: true
    };

    reward += 10;
    state.history.push(`Constructed ${type.toUpperCase()} module at (${r}, ${c}).`);
  } else if (action.startsWith('repair:')) {
    const parts = action.split(':');
    const coords = parts[1].split(',').map(Number);
    const r = coords[0];
    const c = coords[1];

    state.minerals -= 10;
    const b = state.grid[r][c].building;
    b.hp = Math.min(b.maxHp, b.hp + 35);
    reward += 5;
    state.history.push(`Repaired ${b.type.toUpperCase()} at (${r}, ${c}) to ${b.hp}/${b.maxHp} HP.`);
  } else if (action.startsWith('upgrade:')) {
    const parts = action.split(':');
    const coords = parts[1].split(',').map(Number);
    const r = coords[0];
    const c = coords[1];

    const b = state.grid[r][c].building;
    const upCost = Math.floor(BUILDING_COSTS[b.type] * 0.8) || 30;
    state.minerals -= upCost;
    b.tier = 2;
    b.maxHp += 25;
    b.hp += 25;
    reward += 15;
    state.history.push(`Upgraded ${b.type.toUpperCase()} at (${r}, ${c}) to Tier 2.`);
  } else if (action === 'wait') {
    reward += 1;
  }

  // Advance turn simulation
  processTurnEconomy(state);
  state.turn += 1;

  evaluateGameOutcome(state);

  if (state.done) {
    if (state.winner === 'player') reward += 100;
    else reward -= 50;
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let moduleCount = 0;
  let totalHp = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = state.grid[r][c].building;
      if (b && b.hp > 0) {
        moduleCount += 1;
        totalHp += b.hp;
      }
    }
  }

  let total = moduleCount * 15 + state.minerals * 2 + state.colonists * 5 + totalHp;
  if (state.winner === 'player') total += 150;
  return total;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    BUILDING_COSTS,
    BUILDING_POWER
  };
}
