// 0176-flight: Aero Ace - Pure Bot Contract Logic
// Deterministic flight aerodynamics state machine. Zero DOM, zero browser keywords.

const SKY_RINGS = [
  { targetAltitude: 1500, targetBank: 0, distance: 200 },
  { targetAltitude: 2500, targetBank: -15, distance: 450 },
  { targetAltitude: 3200, targetBank: 20, distance: 750 },
  { targetAltitude: 2000, targetBank: 0, distance: 1050 },
  { targetAltitude: 1000, targetBank: -10, distance: 1350 }
];

const RUNWAY_DISTANCE = 1650;
const STALL_SPEED = 80;

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 100,
    altitude: 1200, // ft
    airspeed: 130, // knots
    throttle: 60, // percentage 0 - 100
    pitch: 0, // degrees (-30 dive to +30 climb)
    bank: 0, // degrees (-40 left to +40 right)
    fuel: 100, // percentage
    landingGear: false,
    flightDistance: 0, // nautical units
    currentRingIndex: 0,
    ringsPassed: 0,
    isStalling: false,
    victory: false,
    defeat: false,
    gameMessage: 'Aircraft cruising at 1,200 ft. Line up through the first aerial sky ring.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.ringsPassed * 1200;
  val += Math.floor(state.flightDistance * 3);
  val += Math.floor(state.airspeed * 2);
  val += Math.floor(state.fuel * 8);
  if (state.victory) val += 5000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Throttle
  if (state.throttle < 100) actions.push('action:throttle_increase');
  if (state.throttle > 0) actions.push('action:throttle_decrease');

  // Pitch
  if (state.pitch < 30) actions.push('action:pitch_up');
  if (state.pitch > -30) actions.push('action:pitch_down');

  // Roll / Bank
  if (state.bank > -40) actions.push('action:bank_left');
  if (state.bank < 40) actions.push('action:bank_right');

  // Trim / Level
  actions.push('action:level_wings');

  // Landing Gear
  actions.push('action:toggle_landing_gear');

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal flight action "' + action + '" in current state');
  }

  const oldScore = score(state);

  // Apply Action Input
  if (action === 'action:throttle_increase') {
    state.throttle = Math.min(100, state.throttle + 20);
    state.gameMessage = 'Increased throttle to ' + state.throttle + '%.';
  } else if (action === 'action:throttle_decrease') {
    state.throttle = Math.max(0, state.throttle - 20);
    state.gameMessage = 'Reduced throttle to ' + state.throttle + '%.';
  } else if (action === 'action:pitch_up') {
    state.pitch = Math.min(30, state.pitch + 8);
    state.gameMessage = 'Pulled stick back: pitched up to +' + state.pitch + '°.';
  } else if (action === 'action:pitch_down') {
    state.pitch = Math.max(-30, state.pitch - 8);
    state.gameMessage = 'Pushed stick forward: pitched down to ' + state.pitch + '°.';
  } else if (action === 'action:bank_left') {
    state.bank = Math.max(-40, state.bank - 10);
    state.gameMessage = 'Banked left to ' + state.bank + '°.';
  } else if (action === 'action:bank_right') {
    state.bank = Math.min(40, state.bank + 10);
    state.gameMessage = 'Banked right to ' + state.bank + '°.';
  } else if (action === 'action:level_wings') {
    state.pitch = Math.floor(state.pitch * 0.4);
    state.bank = Math.floor(state.bank * 0.4);
    state.gameMessage = 'Trimmed controls: leveled wings along horizon.';
  } else if (action === 'action:toggle_landing_gear') {
    state.landingGear = !state.landingGear;
    state.gameMessage = state.landingGear ? 'Landing gear deployed down and locked.' : 'Landing gear retracted into bay.';
  }

  // Aerodynamics & Thrust update
  const targetAirspeed = Math.floor(50 + state.throttle * 2.2);
  const accelRate = targetAirspeed > state.airspeed ? 8 : -10;
  state.airspeed = Math.max(40, Math.min(280, state.airspeed + accelRate));

  // Pitch energy conversion: climbing reduces speed, diving gains speed
  if (state.pitch > 0) {
    state.airspeed = Math.max(40, state.airspeed - Math.floor(state.pitch * 0.7));
  } else if (state.pitch < 0) {
    state.airspeed = Math.min(280, state.airspeed + Math.floor(Math.abs(state.pitch) * 0.8));
  }

  // Gear drag
  if (state.landingGear) {
    state.airspeed = Math.min(140, Math.max(40, state.airspeed - 8));
  }

  // Altitude update
  const vertRate = state.pitch * 16;
  state.altitude += vertRate;

  // Stall dynamics
  if (state.airspeed < STALL_SPEED && state.altitude > 0) {
    state.isStalling = true;
    state.altitude -= 250;
    state.pitch = Math.max(-25, state.pitch - 8); // aerodynamic nose drop
    state.gameMessage += ' WARNING: STALL HORN BLARING! Rapid lift loss!';
  } else {
    state.isStalling = false;
  }

  // Altitude clamping
  state.altitude = Math.min(5000, state.altitude);

  // Flight progress distance
  const forwardStep = Math.max(8, Math.floor(state.airspeed * 0.35));
  state.flightDistance += forwardStep;

  // Fuel consumption
  const fuelBurn = Math.max(1, Math.floor(state.throttle / 30) + 1);
  state.fuel = Math.max(0, state.fuel - fuelBurn);

  // Sky Ring Waypoint Interceptions
  if (state.currentRingIndex < SKY_RINGS.length) {
    const ring = SKY_RINGS[state.currentRingIndex];
    if (state.flightDistance >= ring.distance) {
      const altDiff = Math.abs(state.altitude - ring.targetAltitude);
      const bankDiff = Math.abs(state.bank - ring.targetBank);

      if (altDiff <= 400 && bankDiff <= 20) {
        state.ringsPassed += 1;
        state.fuel = Math.min(100, state.fuel + 25);
        state.gameMessage += ' AERO ACE! Pierced Sky Ring #' + (state.currentRingIndex + 1) + ' (+25% Fuel, +1200 Pts)!';
      } else {
        state.gameMessage += ' Missed Sky Ring #' + (state.currentRingIndex + 1) + ' (Altitude/Bank off-course).';
      }
      state.currentRingIndex += 1;
    }
  }

  state.turns += 1;

  // Runway Landing / Crash checks
  if (state.flightDistance >= RUNWAY_DISTANCE || state.altitude <= 0) {
    if (state.flightDistance >= RUNWAY_DISTANCE && state.altitude <= 100) {
      // Touchdown attempt
      const safeSpeed = state.airspeed >= 75 && state.airspeed <= 130;
      const safePitch = Math.abs(state.pitch) <= 10;
      const safeBank = Math.abs(state.bank) <= 10;

      if (state.landingGear && safeSpeed && safePitch && safeBank) {
        state.altitude = 0;
        state.victory = true;
        state.gameMessage = 'TOUCHDOWN! Flawless 3-point landing on island runway! Mission Accomplished!';
      } else {
        state.defeat = true;
        let reason = 'gear collapsed';
        if (!state.landingGear) reason = 'belly landing without gear deployed';
        else if (!safeSpeed) reason = 'landing speed exceeded safety limits';
        else if (!safePitch || !safeBank) reason = 'wingtip ground cartwheel';
        state.gameMessage = 'Defeat: Fatal runway landing crash (' + reason + ')!';
      }
    } else if (state.altitude <= 0) {
      state.defeat = true;
      state.gameMessage = 'Defeat: Crashed into sea level terrain!';
    }
  }

  if (!state.victory && !state.defeat) {
    if (state.fuel <= 0) {
      state.defeat = true;
      state.gameMessage = 'Defeat: Engine starved of fuel in mid-air.';
    } else if (state.turns >= state.maxTurns) {
      state.defeat = true;
      state.gameMessage = 'Defeat: Flight duration limit elapsed. Air traffic diverted.';
    }
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
    SKY_RINGS,
    RUNWAY_DISTANCE,
    STALL_SPEED
  };
}
