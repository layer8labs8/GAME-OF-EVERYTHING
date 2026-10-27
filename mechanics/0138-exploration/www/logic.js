/**
 * 0138-exploration: Abyssal Horizons
 * Pure deep-sea exploration logic conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;
const GRID_SIZE = 6;

const SECTOR_TYPES = {
  EMPTY: 'abyssal_plains',
  VENT: 'hydrothermal_vent',
  REEF: 'bioluminescent_reef',
  GALLEON: 'sunken_galleon',
  MONOLITH: 'primordial_monolith'
};

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 1) {
  // Pre-configured geological map for guaranteed exploration density
  const grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push(SECTOR_TYPES.EMPTY);
    }
    grid.push(row);
  }

  // Key landmarks
  grid[3][1] = SECTOR_TYPES.VENT;
  grid[1][4] = SECTOR_TYPES.VENT;
  grid[4][3] = SECTOR_TYPES.VENT;

  grid[0][2] = SECTOR_TYPES.REEF;
  grid[4][0] = SECTOR_TYPES.REEF;
  grid[3][4] = SECTOR_TYPES.REEF;

  grid[1][3] = SECTOR_TYPES.GALLEON;
  grid[5][1] = SECTOR_TYPES.GALLEON;

  grid[5][5] = SECTOR_TYPES.MONOLITH;

  const charted = { '0,0': true };

  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    x: 0,
    y: 0,
    battery: 60,
    maxBattery: 60,
    hull: 100,
    maxHull: 100,
    specimensCount: 0,
    charted: charted,
    surveyed: {},
    grid: grid,
    score: 10,
    done: false,
    victory: false,
    log: [
      'Submersible deployed into Mariana Sector 0-0.',
      'Chart the abyssal floor and locate the Primordial Monolith.'
    ]
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function addLog(state, line) {
  state.log.push(line);
  if (state.log.length > 20) {
    state.log.shift();
  }
}

function getChartedCount(state) {
  return Object.keys(state.charted).length;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const x = state.x;
  const y = state.y;
  const curSector = state.grid[y][x];
  const curKey = x + ',' + y;

  // Navigation moves (cost 2 battery)
  if (state.battery >= 2) {
    if (y > 0) actions.push('move:north');
    if (y < GRID_SIZE - 1) actions.push('move:south');
    if (x < GRID_SIZE - 1) actions.push('move:east');
    if (x > 0) actions.push('move:west');
  }

  // Sonar pulse (costs 5 battery)
  if (state.battery >= 5) {
    actions.push('action:sonar_pulse');
  }

  // Geothermal vent tap (recharges battery)
  if (curSector === SECTOR_TYPES.VENT && state.battery < state.maxBattery) {
    actions.push('action:harness_vent');
  }

  // Survey specimen if anomaly present and not yet surveyed
  if (
    (curSector === SECTOR_TYPES.REEF || curSector === SECTOR_TYPES.GALLEON || curSector === SECTOR_TYPES.VENT) &&
    !state.surveyed[curKey]
  ) {
    actions.push('action:survey_specimen');
  }

  // Monolith activation
  if (curSector === SECTOR_TYPES.MONOLITH && getChartedCount(state) >= 12) {
    actions.push('action:survey_monolith');
  }

  // Emergency recharge / ping if battery is low to prevent deadlocks
  if (actions.length === 0) {
    actions.push('action:emergency_drift');
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Exploration mission is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Move
  if (action.startsWith('move:')) {
    const dir = action.split(':')[1];
    state.battery = Math.max(0, state.battery - 2);

    if (dir === 'north') state.y -= 1;
    if (dir === 'south') state.y += 1;
    if (dir === 'east') state.x += 1;
    if (dir === 'west') state.x -= 1;

    const key = state.x + ',' + state.y;
    const isNew = !state.charted[key];
    state.charted[key] = true;

    if (isNew) {
      state.score += 5;
      reward += 3;
      addLog(state, `Charted Sector (${state.x}, ${state.y}) - Unveiled new seafloor topology.`);
    } else {
      reward += 1;
      addLog(state, `Navigated to Sector (${state.x}, ${state.y}).`);
    }

    // Check sector feature
    const sectorType = state.grid[state.y][state.x];
    if (sectorType === SECTOR_TYPES.VENT) {
      addLog(state, 'Sensor Warning: Thermal exhaust detected! Hydrothermal Vent available for battery recharge.');
    } else if (sectorType === SECTOR_TYPES.REEF) {
      addLog(state, 'Bioluminescent illumination detected! Alien deep-sea reef flora in range.');
    } else if (sectorType === SECTOR_TYPES.GALLEON) {
      addLog(state, 'Radar return: Ancient titanium-clad galleon wreckage resting on the seabed.');
    } else if (sectorType === SECTOR_TYPES.MONOLITH) {
      addLog(state, 'SECTOR APEX REACHED: The Primordial Monolith towers in the abyssal rift!');
    }
  }

  // Sonar Pulse
  else if (action === 'action:sonar_pulse') {
    state.battery = Math.max(0, state.battery - 5);
    reward += 2;
    state.score += 5;
    let newSectors = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = state.x + dx;
        const ny = state.y + dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          const k = nx + ',' + ny;
          if (!state.charted[k]) {
            state.charted[k] = true;
            newSectors += 1;
            state.score += 3;
          }
        }
      }
    }
    addLog(state, `Acoustic Sonar Pulse emitted! Mapped ${newSectors} surrounding sector points.`);
  }

  // Harness Vent
  else if (action === 'action:harness_vent') {
    const recharged = Math.min(30, state.maxBattery - state.battery);
    state.battery += recharged;
    reward += 10;
    state.score += 15;
    addLog(state, `Geothermal heat exchanger engaged: Harnessed ${recharged} units of battery energy!`);
  }

  // Survey Specimen
  else if (action === 'action:survey_specimen') {
    const k = state.x + ',' + state.y;
    state.surveyed[k] = true;
    state.specimensCount += 1;
    reward += 15;
    state.score += 25;
    addLog(state, `Survey complete: Analyzed and logged unique marine specimen #${state.specimensCount}.`);
  }

  // Survey Monolith (Climax)
  else if (action === 'action:survey_monolith') {
    state.victory = true;
    state.done = true;
    reward += 100;
    state.score += 150;
    addLog(state, 'MISSION COMPLETE: Primordial Monolith scanned and transcribed! Abyssal anomaly solved.');
    return { reward, done: true };
  }

  // Emergency drift
  else if (action === 'action:emergency_drift') {
    state.battery += 5;
    reward -= 2;
    addLog(state, 'Submersible deployed passive oceanic current turbine to scrape minimal emergency power.');
  }

  // Depletion check
  if (state.battery <= 0) {
    state.done = true;
    state.victory = false;
    reward -= 40;
    addLog(state, 'Submersible battery completely drained. Vessel lost in the abyss.');
  }

  // Turn bound check
  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Exploration mission timeframe elapsed.');
  }

  return { reward, done: state.done };
}

// Module export for Node.js test runners & Bot checkers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_TURNS,
    GRID_SIZE,
    SECTOR_TYPES
  };
}
