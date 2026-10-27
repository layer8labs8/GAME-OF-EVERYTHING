// 0155-space-sim: Void Navigator - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const SECTOR_NAMES = [
  'Terra Prime Orbit',
  'Inner Asteroid Belt',
  'Titan Gas Giant Orbit',
  'Deep Kuiper Void',
  'Galactic Gateway'
];

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    hull: 100,
    shields: 100,
    fuel: 80,
    power: 90,
    credits: 300,
    scienceData: 20,
    sector: 0,
    sectorProgress: 0,
    docked: false,
    surveysCompleted: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Vessel unmoored in Terra Prime orbit. Flight computers online.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.credits;
  val += state.scienceData * 5;
  val += state.sector * 300;
  val += state.surveysCompleted * 100;
  val += Math.floor(state.hull * 3);
  val += Math.floor(state.shields * 2);
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  if (state.docked) {
    actions.push('action:undock_from_station');
    if (state.credits >= 100 && state.fuel < 100) {
      actions.push('action:station_refuel');
    }
    if (state.credits >= 120 && state.hull < 100) {
      actions.push('action:station_repair');
    }
    if (state.power >= 10) {
      actions.push('action:scan_planetary_anomaly');
    }
    return actions;
  }

  // Flight operations
  actions.push('action:solar_charge');

  if (state.fuel >= 12) {
    actions.push('action:prograde_burn');
  }
  if (state.fuel >= 8 && state.sectorProgress > 0) {
    actions.push('action:retrograde_burn');
  }
  if (state.power >= 15 && state.shields < 100) {
    actions.push('action:recharge_shields');
  }
  if (state.power >= 10) {
    actions.push('action:scan_planetary_anomaly');
  }
  if (state.power >= 12) {
    actions.push('action:deploy_mining_drone');
  }

  // Station docking (available in sectors 0, 2, 4 when at orbit boundaries)
  if ((state.sector === 0 || state.sector === 2 || state.sector === 4) &&
      (state.sectorProgress === 0 || state.sectorProgress >= 100)) {
    actions.push('action:dock_with_station');
  }

  // Hyperspace jump to next sector
  if (state.sectorProgress >= 100 && state.fuel >= 20 && state.sector < 4) {
    actions.push('action:hyperjump');
  }

  // Victory trigger at Galactic Gateway
  if (state.sector === 4 && state.credits >= 2000 && state.scienceData >= 150) {
    actions.push('action:align_with_gateway');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal flight action "' + action + '" in current telemetry state');
  }

  const oldScore = score(state);

  if (action === 'action:solar_charge') {
    state.power = Math.min(100, state.power + 35);
    state.gameMessage = 'Deployed solar photovoltaic sails. Capacitor replenished to ' + state.power + '%.';
  } else if (action === 'action:prograde_burn') {
    state.fuel = Math.max(0, state.fuel - 12);
    state.power = Math.max(0, state.power - 5);
    state.sectorProgress = Math.min(100, state.sectorProgress + 35);
    if (state.sectorProgress >= 100) {
      state.gameMessage = 'Sector transit burn complete! Approaching jump corridor / orbital station.';
    } else {
      state.gameMessage = 'Main thrusters fired. Sector traversal at ' + state.sectorProgress + '%.';
    }
  } else if (action === 'action:retrograde_burn') {
    state.fuel = Math.max(0, state.fuel - 8);
    state.sectorProgress = Math.max(0, state.sectorProgress - 25);
    state.gameMessage = 'Retro-thrusters stabilized orbital velocity.';
  } else if (action === 'action:recharge_shields') {
    state.power = Math.max(0, state.power - 15);
    state.shields = Math.min(100, state.shields + 35);
    state.gameMessage = 'Auxiliary generator energized deflector shields to ' + state.shields + '%.';
  } else if (action === 'action:scan_planetary_anomaly') {
    state.power = Math.max(0, state.power - 10);
    state.scienceData += 25;
    state.credits += 65;
    state.surveysCompleted += 1;
    state.gameMessage = 'Sensor array captured celestial spectroscopy data. +25 Science, +$65 Credits.';
  } else if (action === 'action:deploy_mining_drone') {
    state.power = Math.max(0, state.power - 12);
    if (state.sector === 1) { // Asteroid belt bonus
      state.fuel = Math.min(100, state.fuel + 24);
      state.credits += 70;
      state.gameMessage = 'Mining drone extracted volatile ice and rare metals from asteroid belt. +24 Fuel, +$70 Credits.';
    } else {
      state.fuel = Math.min(100, state.fuel + 15);
      state.credits += 45;
      state.gameMessage = 'Mining drone retrieved comet dust and hydrogen isotopes. +15 Fuel, +$45 Credits.';
    }
  } else if (action === 'action:dock_with_station') {
    state.docked = true;
    state.gameMessage = 'Magnetic clamps engaged. Vessel securely docked with orbital hub.';
  } else if (action === 'action:undock_from_station') {
    state.docked = false;
    state.gameMessage = 'Airlocks sealed. Vessel released from orbital docking bay.';
  } else if (action === 'action:station_refuel') {
    state.credits = Math.max(0, state.credits - 100);
    state.fuel = Math.min(100, state.fuel + 45);
    state.gameMessage = 'Replenished hydrazine fuel tanks at station refinery.';
  } else if (action === 'action:station_repair') {
    state.credits = Math.max(0, state.credits - 120);
    state.hull = Math.min(100, state.hull + 35);
    state.gameMessage = 'Station drydock engineering repaired structural hull armor.';
  } else if (action === 'action:hyperjump') {
    state.fuel = Math.max(0, state.fuel - 20);
    state.sector += 1;
    state.sectorProgress = 0;
    state.gameMessage = 'Hyperspace jump vector executed! Entered ' + SECTOR_NAMES[state.sector] + '.';
  } else if (action === 'action:align_with_gateway') {
    state.victory = true;
    state.gameMessage = 'Victory! Galactic Gateway resonance aligned! Warp conduit opens across the stars.';
  }

  // Environmental Hazards (if not docked)
  if (!state.docked && action !== 'action:align_with_gateway') {
    const hazardRoll = nextRand(state);
    if (hazardRoll < 0.22) {
      if (state.shields >= 20) {
        state.shields -= 20;
        state.gameMessage += ' (Deflector shields absorbed micrometeorite barrage!)';
      } else {
        const breach = 20 - state.shields;
        state.shields = 0;
        state.hull = Math.max(0, state.hull - breach);
        state.gameMessage += ' (Micrometeorite impact caused hull breach! -' + breach + ' Hull.)';
      }
    }
  }

  // Turn advance
  state.turns += 1;

  // Win / Loss evaluation
  if (state.hull <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Hull integrity failed! Vessel disintegrated in deep space.';
  } else if (state.fuel <= 0 && state.power <= 0 && !state.docked) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Life support and propulsion lost. Stranded eternally in vacuum.';
  } else if (state.turns >= state.maxTurns) {
    if (state.sector >= 3 && state.credits >= 1500) {
      state.victory = true;
      state.gameMessage = 'Victory: Deep space expedition concluded with successful cartography!';
    } else {
      state.gameMessage = 'Flight mission duration expired. Transceiver returned to base.';
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
    SECTOR_NAMES
  };
}
