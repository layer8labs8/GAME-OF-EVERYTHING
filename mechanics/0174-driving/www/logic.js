// 0174-driving: Highway Hauler - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

const ROUTE_LENGTH_KM = 100;
const GEAR_MAX_SPEED = { 1: 40, 2: 80, 3: 120 };

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function spawnTraffic(state) {
  const lanes = [null, null, null];
  const hazardLane = Math.floor(nextRand(state) * 3);
  if (nextRand(state) < 0.65) {
    lanes[hazardLane] = {
      type: nextRand(state) < 0.5 ? 'slow_van' : 'road_work',
      speed: 35
    };
  }
  return lanes;
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    gear: 1,
    speed: 30,
    lane: 1, // Cruising middle lane
    fuel: 100,
    fatigue: 0,
    cargoIntegrity: 100,
    distance: 0,
    traffic: [null, null, null],
    restStopsVisited: 0,
    deliveriesCompleted: 0,
    victory: false,
    defeat: false,
    gameMessage: '18-wheeler diesel engine idling at Interstate on-ramp. Deliver fragile cargo safely.'
  };

  state.traffic = spawnTraffic(state);

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.distance * 80;
  val += Math.floor(state.cargoIntegrity * 20);
  val += Math.floor(state.fuel * 5);
  val += Math.max(0, 100 - state.fatigue) * 10;
  if (state.victory) val += 5000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Throttle
  if (state.fuel > 0) {
    actions.push('action:accelerate_throttle');
  }

  // Braking is always accessible
  actions.push('action:apply_service_brakes');

  // Gear shifts
  if (state.gear < 3 && state.speed >= 25) {
    actions.push('action:shift_gear_up');
  }
  if (state.gear > 1) {
    actions.push('action:shift_gear_down');
  }

  // Lane merges
  if (state.lane > 0) {
    actions.push('action:shift_lane:left');
  }
  if (state.lane < 2) {
    actions.push('action:shift_lane:right');
  }

  // Service stop actions
  if (state.fuel < 85) {
    actions.push('action:stop_at_fuel_depot');
  }
  if (state.fatigue >= 25) {
    actions.push('action:rest_sleeper_cab');
  }

  // Terminal delivery
  if (state.distance >= ROUTE_LENGTH_KM && state.cargoIntegrity >= 50) {
    actions.push('action:deliver_freight');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal driving action "' + action + '" in current state');
  }

  const oldScore = score(state);

  if (action === 'action:accelerate_throttle') {
    const targetMax = GEAR_MAX_SPEED[state.gear];
    state.speed = Math.min(targetMax, state.speed + 15);
    state.fuel = Math.max(0, state.fuel - 2);
    state.gameMessage = 'Applied throttle: accelerated to ' + state.speed + ' km/h in Gear ' + state.gear + '.';
  } else if (action === 'action:apply_service_brakes') {
    state.speed = Math.max(0, state.speed - 30);
    state.gameMessage = 'Engaged pneumatic service brakes: decelerated to ' + state.speed + ' km/h.';
  } else if (action === 'action:shift_gear_up') {
    state.gear = Math.min(3, state.gear + 1);
    state.gameMessage = 'Shifted transmission up to Gear ' + state.gear + '.';
  } else if (action === 'action:shift_gear_down') {
    state.gear = Math.max(1, state.gear - 1);
    state.speed = Math.min(GEAR_MAX_SPEED[state.gear], state.speed);
    state.gameMessage = 'Shifted transmission down to Gear ' + state.gear + '.';
  } else if (action === 'action:shift_lane:left') {
    state.lane = Math.max(0, state.lane - 1);
    state.gameMessage = 'Signaled and merged into Lane ' + state.lane + ' (Left).';
  } else if (action === 'action:shift_lane:right') {
    state.lane = Math.min(2, state.lane + 1);
    state.gameMessage = 'Signaled and merged into Lane ' + state.lane + ' (Right).';
  } else if (action === 'action:stop_at_fuel_depot') {
    state.fuel = 100;
    state.speed = 20;
    state.restStopsVisited += 1;
    state.gameMessage = 'Pulled into highway travel plaza: filled diesel tank to 100%.';
  } else if (action === 'action:rest_sleeper_cab') {
    state.fatigue = 0;
    state.speed = 0;
    state.restStopsVisited += 1;
    state.gameMessage = 'Took mandatory rest break in sleeper cab. Fatigue fully restored to 0%.';
  } else if (action === 'action:deliver_freight') {
    state.victory = true;
    state.deliveriesCompleted += 1;
    state.gameMessage = 'VICTORY! Freight successfully docked at coastal container terminal!';
  }

  // Distance progression based on road speed
  const kmGain = Math.max(1, Math.floor(state.speed / 25));
  state.distance = Math.min(ROUTE_LENGTH_KM, state.distance + kmGain);

  // Fatigue accumulation
  if (action !== 'action:rest_sleeper_cab') {
    state.fatigue = Math.min(100, state.fatigue + 2);
  }

  // Traffic collision evaluation
  const obstacleInLane = state.traffic[state.lane];
  if (obstacleInLane && state.speed > obstacleInLane.speed) {
    const impact = Math.floor((state.speed - obstacleInLane.speed) / 2);
    state.cargoIntegrity = Math.max(0, state.cargoIntegrity - impact);
    state.speed = obstacleInLane.speed;
    state.gameMessage += ' Tailgated slow traffic in lane! Hard brake slammed cargo (-' + impact + '% integrity).';
  }

  // Spawn new traffic ahead
  state.traffic = spawnTraffic(state);

  state.turns += 1;

  // Defeat checks
  if (state.fuel <= 0 && state.distance < ROUTE_LENGTH_KM) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Out of diesel. Stranded on highway shoulder.';
  } else if (state.fatigue >= 100) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Extreme driver fatigue induced micro-sleep highway crash.';
  } else if (state.cargoIntegrity <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Fragile electronic cargo completely destroyed in transit.';
  } else if (state.turns >= state.maxTurns && !state.victory) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Delivery contract deadline expired.';
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
    ROUTE_LENGTH_KM,
    GEAR_MAX_SPEED
  };
}
