// 0175-hill-climb-racing: Peak Climber - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

const SUMMIT_DISTANCE = 1000;
const UPGRADE_TYPES = ['engine', 'suspension', 'tires'];

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function getSlopeAngle(dist) {
  const slope = Math.cos(dist * 0.04) * 0.6 + Math.cos(dist * 0.015) * 0.4;
  return Math.floor(Math.atan(slope) * (180 / Math.PI));
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    distance: 0,
    velocity: 8,
    pitchAngle: 0, // degrees: positive is nose-up, negative is nose-down
    fuel: 100,
    coins: 30,
    airborne: false,
    upgrades: {
      engine: 0,
      suspension: 0,
      tires: 0
    },
    flipsCompleted: 0,
    lastFuelCanDistance: 0,
    victory: false,
    defeat: false,
    gameMessage: '4x4 Off-roader idling at trail base. Gas up the incline and reach the 1000m peak.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.distance * 10;
  val += state.coins * 15;
  val += state.flipsCompleted * 200;
  val += (state.upgrades.engine + state.upgrades.suspension + state.upgrades.tires) * 150;
  val += Math.floor(state.fuel * 5);
  if (state.victory) val += 5000;
  return Math.max(0, Math.floor(val));
}

function getUpgradeCost(level) {
  return 25 * (level + 1);
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Throttle
  if (state.fuel > 0) {
    actions.push('action:gas_accelerate');
  }

  // Brake / Reverse
  actions.push('action:brake_reverse');

  // Pitch balance
  actions.push('action:tilt_forward');
  actions.push('action:tilt_backward');

  // Upgrades
  for (const u of UPGRADE_TYPES) {
    const cost = getUpgradeCost(state.upgrades[u]);
    if (state.coins >= cost && state.upgrades[u] < 4) {
      actions.push('action:upgrade_vehicle:' + u);
    }
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal hill climb action "' + action + '" in current state');
  }

  const oldScore = score(state);

  const enginePower = 3 + state.upgrades.engine * 1.5;
  const suspensionDamp = 1 + state.upgrades.suspension * 0.5;
  const tireGrip = 1 + state.upgrades.tires * 0.4;

  if (action === 'action:gas_accelerate') {
    state.velocity = Math.min(25, state.velocity + Math.floor(enginePower * tireGrip));
    state.pitchAngle = Math.min(85, state.pitchAngle + 12);
    state.fuel = Math.max(0, state.fuel - 3);
    state.gameMessage = 'Hit the gas: surged forward at ' + state.velocity + ' m/s.';
  } else if (action === 'action:brake_reverse') {
    state.velocity = Math.max(2, state.velocity - 6);
    state.pitchAngle = Math.max(-85, state.pitchAngle - 14);
    state.gameMessage = 'Hit the brakes: slowed down to ' + state.velocity + ' m/s.';
  } else if (action === 'action:tilt_forward') {
    state.pitchAngle = Math.max(-85, state.pitchAngle - 18);
    state.gameMessage = 'Tilted nose forward: balanced chassis angle to ' + state.pitchAngle + '°.';
  } else if (action === 'action:tilt_backward') {
    state.pitchAngle = Math.min(85, state.pitchAngle + 18);
    state.gameMessage = 'Tilted nose backward: balanced chassis angle to ' + state.pitchAngle + '°.';
  } else if (action.startsWith('action:upgrade_vehicle:')) {
    const u = action.split(':')[2];
    const cost = getUpgradeCost(state.upgrades[u]);
    state.coins -= cost;
    state.upgrades[u] += 1;
    state.gameMessage = 'Upgraded ' + u + ' to Level ' + state.upgrades[u] + '!';
  }

  // Terrain slope interaction
  const slope = getSlopeAngle(state.distance);

  // Crash detection: vehicle overturned
  if (Math.abs(state.pitchAngle) >= 75 || Math.abs(state.pitchAngle - slope) >= 65) {
    if (!state.airborne) {
      state.defeat = true;
      state.gameMessage = 'Defeat: Vehicle flipped upside down! Driver neck snap crash!';
    }
  }

  // If velocity is high launching off crest, become airborne
  if (slope < -15 && state.velocity > 12) {
    state.airborne = true;
    state.gameMessage += ' (AIR TIME! Soaring over mountain ridge!)';
  } else if (!state.defeat) {
    state.airborne = false;
    // Ground alignment pull dampened by suspension
    const angleDiff = slope - state.pitchAngle;
    state.pitchAngle += Math.floor(angleDiff / (suspensionDamp + 1));
  }

  // Advance distance
  state.distance = Math.min(SUMMIT_DISTANCE, state.distance + state.velocity);

  // Passive fuel drain and coin pickups
  state.fuel = Math.max(0, state.fuel - 1);
  state.coins += 2;

  // Roadside Fuel Canisters (every 100m)
  if (state.distance - state.lastFuelCanDistance >= 100) {
    state.fuel = Math.min(100, state.fuel + 45);
    state.coins += 15;
    state.lastFuelCanDistance = state.distance;
    state.gameMessage += ' Snatched roadside Red Fuel Can (+45% Fuel, +15 Coins)!';
  }

  state.turns += 1;

  // Victory / Defeat checks
  if (state.defeat) {
    // Already flagged flip crash
  } else if (state.distance >= SUMMIT_DISTANCE && state.fuel > 0) {
    state.victory = true;
    state.gameMessage = 'VICTORY! Successfully conquered the 1,000m Mountain Summit!';
  } else if (state.fuel <= 0 && state.distance < SUMMIT_DISTANCE) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Ran out of gas on the mountain incline.';
  } else if (state.turns >= state.maxTurns && !state.victory) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Mountain blizzard engulfed the summit before arrival.';
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
    SUMMIT_DISTANCE,
    UPGRADE_TYPES,
    getSlopeAngle,
    getUpgradeCost
  };
}
