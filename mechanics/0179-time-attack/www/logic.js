// 0179-time-attack: Speed Chrono - Pure Bot Contract Logic
// Deterministic lap time-attack circuit state machine. Zero DOM, zero browser keywords.

const SECTORS = [
  { name: 'S-Chicane', start: 0, end: 300, targetSpeed: 140, idealLine: -20, ghostSplit: 120 },
  { name: 'Speed Sweeper', start: 300, end: 650, targetSpeed: 220, idealLine: 40, ghostSplit: 250 },
  { name: 'Monaco Hairpin', start: 650, end: 950, targetSpeed: 80, idealLine: -50, ghostSplit: 400 },
  { name: 'DRS Straightaway', start: 950, end: 1250, targetSpeed: 290, idealLine: 0, ghostSplit: 510 },
  { name: 'Final S-Curves', start: 1250, end: 1500, targetSpeed: 130, idealLine: 20, ghostSplit: 650 }
];

const CIRCUIT_LENGTH = 1500;
const GOLD_TARGET_TIME = 650; // deciseconds (65.0s)
const TIME_LIMIT = 800; // deciseconds (80.0s)

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function getCurrentSector(dist) {
  for (let i = 0; i < SECTORS.length; i++) {
    if (dist < SECTORS[i].end) return SECTORS[i];
  }
  return SECTORS[SECTORS.length - 1];
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 80,
    distance: 0, // meters
    speed: 90, // km/h
    timeElapsed: 0, // deciseconds (tenths of a second)
    line: 0, // -100 (inside curb) to +100 (outside wall)
    tireHeat: 60, // Celsius (optimal 50-80)
    boost: 75, // percentage
    sectorIndex: 0,
    perfectApexCount: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Hypercar launching out of pit lane. Target Gold Lap: 65.0s!'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = Math.max(0, 80000 - state.timeElapsed * 80);
  val += state.perfectApexCount * 2500;
  val += state.distance * 15;
  val += Math.floor(state.speed * 10);
  if (state.victory) val += 30000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Throttle
  actions.push('action:throttle_accelerate');

  // Braking
  actions.push('action:apex_brake');

  // Steering
  if (state.line > -90) actions.push('action:steer_inside_curb');
  if (state.line < 90) actions.push('action:steer_outside_line');

  // Boost
  if (state.boost >= 25) {
    actions.push('action:boost_overdrive');
  }

  // Coasting / Flow
  actions.push('action:maintain_coasting');

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal time attack action "' + action + '" in current state');
  }

  const oldScore = score(state);
  const curSector = getCurrentSector(state.distance);

  // Apply Driver Input
  if (action === 'action:throttle_accelerate') {
    state.speed = Math.min(310, state.speed + 35);
    state.tireHeat = Math.min(100, state.tireHeat + 4);
    state.gameMessage = 'Full throttle applied! Surged to ' + state.speed + ' km/h.';
  } else if (action === 'action:apex_brake') {
    state.speed = Math.max(45, state.speed - 50);
    state.line = Math.floor(state.line * 0.7); // stabilizes line
    state.tireHeat = Math.max(40, state.tireHeat - 5);
    state.gameMessage = 'Heavy trail-braking down to ' + state.speed + ' km/h into apex.';
  } else if (action === 'action:steer_inside_curb') {
    state.line = Math.max(-100, state.line - 28);
    state.tireHeat = Math.min(100, state.tireHeat + 3);
    state.gameMessage = 'Cut hard inside toward inner curb (Line: ' + state.line + ').';
  } else if (action === 'action:steer_outside_line') {
    state.line = Math.min(100, state.line + 28);
    state.tireHeat = Math.min(100, state.tireHeat + 3);
    state.gameMessage = 'Drifted wide to outer track exit (Line: ' + state.line + ').';
  } else if (action === 'action:boost_overdrive') {
    state.boost = Math.max(0, state.boost - 25);
    state.speed = Math.min(320, state.speed + 55);
    state.tireHeat = Math.min(100, state.tireHeat + 6);
    state.gameMessage = 'KERS BOOST DISCHARGE! Blistering acceleration to ' + state.speed + ' km/h!';
  } else if (action === 'action:maintain_coasting') {
    state.speed = Math.max(40, state.speed - 6);
    state.tireHeat = Math.max(45, state.tireHeat - 8);
    state.gameMessage = 'Feathered throttle smoothly, stabilizing chassis dynamics.';
  }

  // Apex accuracy check
  const lineDiff = Math.abs(state.line - curSector.idealLine);
  const speedDiff = Math.abs(state.speed - curSector.targetSpeed);

  if (lineDiff <= 25 && speedDiff <= 35) {
    state.perfectApexCount += 1;
    state.timeElapsed = Math.max(0, state.timeElapsed - 2); // shaves time
    state.gameMessage += ' (PERFECT RACING LINE APEX HIT! -0.2s split bonus!)';
  }

  // Advance Track Progress
  const distDelta = Math.max(16, Math.floor(state.speed * 0.28));
  const oldDist = state.distance;
  state.distance = Math.min(CIRCUIT_LENGTH, state.distance + distDelta);

  // Time elapsed computation: higher speed traverses distance in fewer deciseconds
  const timeStep = Math.max(6, Math.floor(2200 / (state.speed + 30)));
  state.timeElapsed += timeStep;

  // Sector checkpoint transitions
  const newSector = getCurrentSector(state.distance);
  if (newSector !== curSector) {
    state.boost = Math.min(100, state.boost + 25);
    const ghostDelta = (state.timeElapsed - curSector.ghostSplit) / 10;
    const deltaSign = ghostDelta <= 0 ? '-' : '+';
    state.gameMessage += ' Sector Checkpoint: ' + deltaSign + Math.abs(ghostDelta).toFixed(1) + 's vs Gold Ghost!';
  }

  state.turns += 1;

  // Barrier impact check
  if (Math.abs(state.line) >= 95 && state.speed > 175) {
    state.defeat = true;
    state.gameMessage = 'Defeat: High-speed collision against perimeter Armco barrier!';
  } else if (state.distance >= CIRCUIT_LENGTH) {
    const finalSeconds = (state.timeElapsed / 10).toFixed(1);
    if (state.timeElapsed <= GOLD_TARGET_TIME) {
      state.victory = true;
      state.gameMessage = 'GOLD RECORD CRUSHED! Lap completed in ' + finalSeconds + 's (Gold target was 65.0s)!';
    } else if (state.timeElapsed <= TIME_LIMIT) {
      state.victory = true;
      state.gameMessage = 'CIRCUIT TIME TRIAL CLEARED! Final Lap Time: ' + finalSeconds + 's!';
    } else {
      state.defeat = true;
      state.gameMessage = 'Defeat: Lap time (' + finalSeconds + 's) exceeded qualification cutoff.';
    }
  } else if (state.timeElapsed >= TIME_LIMIT || state.turns >= state.maxTurns) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Chrono timer expired before crossing the finish line.';
  }

  const newScore = score(state);
  const reward = newScore - oldScore;
  const done = isOver(state);

  return { reward, done };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    SECTORS,
    CIRCUIT_LENGTH,
    GOLD_TARGET_TIME,
    TIME_LIMIT,
    getCurrentSector
  };
}
