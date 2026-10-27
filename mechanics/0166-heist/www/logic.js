// 0166-heist: Vault Infiltrator - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

const ZONE_NAMES = [
  'Perimeter Alley',
  'Security Monitoring Hub',
  'Vault Antechamber',
  'Titanium Deep Vault'
];

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
    maxTurns: 120,
    zone: 0,
    suspicion: 10,
    alarmTriggered: false,
    pagersRemaining: 4,
    crewHealth: 100,
    cctvLooped: [true, false, false, false],
    doorUnlocked: [true, false, false, false],
    guardsInZone: [0, 2, 2, 1],
    empJammers: 2,
    empActiveTurns: 0,
    drillDeployed: false,
    drillProgress: 0,
    drillJammed: false,
    vaultOpened: false,
    hasImperialDiamond: false,
    cashBags: 0,
    goldBags: 0,
    maxCash: 4,
    maxGold: 3,
    lootValue: 0,
    guardsNeutralized: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Getaway van idling in perimeter alley. Infiltrate security hub and breach deep vault.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = Math.floor(state.lootValue / 500);
  val += state.guardsNeutralized * 100;
  val += Math.floor(state.crewHealth * 10);
  if (!state.alarmTriggered) val += 1000; // Ghost stealth bonus
  if (state.hasImperialDiamond) val += 2000;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Surveillance Recon (always available)
  actions.push('action:recon_surveillance');

  // EMP Jammer
  if (state.empJammers > 0 && state.empActiveTurns === 0) {
    actions.push('action:deploy_emp_jammer');
  }

  // Camera Hacking
  if (state.zone > 0 && !state.cctvLooped[state.zone]) {
    actions.push('action:hack_camera_loop');
  }

  // Guard Takedown
  if (state.guardsInZone[state.zone] > 0) {
    actions.push('action:silent_guard_takedown');
  }

  // Lockpicking next zone door
  if (state.zone < 3 && !state.doorUnlocked[state.zone + 1]) {
    actions.push('action:pick_security_lock');
  }

  // Zone Transit
  if (state.zone > 0) {
    actions.push('action:advance_to_zone:' + (state.zone - 1));
  }
  if (state.zone < 3 && state.doorUnlocked[state.zone + 1]) {
    // If heading into Deep Vault (zone 3), vault door must be opened
    if (state.zone + 1 === 3) {
      if (state.vaultOpened) {
        actions.push('action:advance_to_zone:3');
      }
    } else {
      actions.push('action:advance_to_zone:' + (state.zone + 1));
    }
  }

  // Vault Drilling in Zone 2
  if (state.zone === 2 && !state.vaultOpened) {
    if (!state.drillDeployed) {
      actions.push('action:start_thermal_drill');
    } else if (state.drillJammed) {
      actions.push('action:service_drill');
    }
  }

  // Loot Bagging in Zone 3
  if (state.zone === 3 && state.vaultOpened) {
    if (!state.hasImperialDiamond) {
      actions.push('action:bag_imperial_diamond');
    }
    if (state.goldBags < state.maxGold) {
      actions.push('action:bag_gold');
    }
    if (state.cashBags < state.maxCash) {
      actions.push('action:bag_cash');
    }
  }

  // Combat Defense during Alarm
  if (state.alarmTriggered) {
    actions.push('action:defend_against_swat');
  }

  // Escape to Getaway Van in Zone 0
  if (state.zone === 0 && state.lootValue >= 500000 && state.hasImperialDiamond) {
    actions.push('action:escape_in_getaway_van');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal heist action "' + action + '" in current state');
  }

  const oldScore = score(state);

  if (action === 'action:recon_surveillance') {
    state.suspicion = Math.max(0, state.suspicion - 10);
    state.gameMessage = 'Scouted patrol vectors and camera blind spots. Suspicion cooled (-10%).';
  } else if (action === 'action:deploy_emp_jammer') {
    state.empJammers -= 1;
    state.empActiveTurns = 3;
    state.suspicion = Math.max(0, state.suspicion - 25);
    state.gameMessage = 'EMP jammer triggered! Security lasers and cameras suppressed for 3 turns.';
  } else if (action === 'action:hack_camera_loop') {
    state.cctvLooped[state.zone] = true;
    state.gameMessage = 'Spliced into security matrix: CCTV video feed looped in ' + ZONE_NAMES[state.zone] + '.';
  } else if (action === 'action:silent_guard_takedown') {
    state.guardsInZone[state.zone] -= 1;
    state.guardsNeutralized += 1;
    if (state.pagersRemaining > 0) {
      state.pagersRemaining -= 1;
      state.gameMessage = 'Silently choked out guard and responded on radio pager (' + state.pagersRemaining + ' pagers left).';
    } else {
      state.alarmTriggered = true;
      state.gameMessage = 'Guard eliminated, but operator detected silence on pager! ALARM TRIGGERED!';
    }
  } else if (action === 'action:pick_security_lock') {
    const nextZ = state.zone + 1;
    state.doorUnlocked[nextZ] = true;
    state.gameMessage = 'Bypassed reinforced pneumatic lock for ' + ZONE_NAMES[nextZ] + '.';
  } else if (action.startsWith('action:advance_to_zone:')) {
    const targetZ = parseInt(action.split(':')[2], 10);
    state.zone = targetZ;
    state.gameMessage = 'Moved into ' + ZONE_NAMES[targetZ] + '.';
  } else if (action === 'action:start_thermal_drill') {
    state.drillDeployed = true;
    state.drillProgress = 20;
    state.gameMessage = 'Mounted BFX-9000 Thermal Lance onto titanium vault door. Drilling underway!';
  } else if (action === 'action:service_drill') {
    state.drillJammed = false;
    state.drillProgress = Math.min(100, state.drillProgress + 25);
    state.gameMessage = 'Cleared thermal drill bit jam and restarted compression motor.';
  } else if (action === 'action:bag_cash') {
    state.cashBags += 1;
    state.lootValue += 50000;
    state.gameMessage = 'Bagged federal currency bundle (+$50,000 | Total: $' + state.lootValue.toLocaleString() + ').';
  } else if (action === 'action:bag_gold') {
    state.goldBags += 1;
    state.lootValue += 100000;
    state.gameMessage = 'Secured 24-karat solid gold bullion bar (+$100,000 | Total: $' + state.lootValue.toLocaleString() + ').';
  } else if (action === 'action:bag_imperial_diamond') {
    state.hasImperialDiamond = true;
    state.lootValue += 500000;
    state.gameMessage = 'JACKPOT! Secured the 120-carat Imperial Diamond (+$500,000 | Total: $' + state.lootValue.toLocaleString() + ')!';
  } else if (action === 'action:defend_against_swat') {
    const dmg = 8 + Math.floor(nextRand(state) * 8);
    state.crewHealth = Math.max(0, state.crewHealth - dmg);
    state.gameMessage = 'Returned suppressing fire against tactical SWAT assault! Took -' + dmg + ' health.';
  } else if (action === 'action:escape_in_getaway_van') {
    state.victory = true;
    state.gameMessage = 'Victory! Crew dove into getaway van with $' + state.lootValue.toLocaleString() + ' in diamonds and gold!';
  }

  // Passive drill progression
  if (state.drillDeployed && !state.vaultOpened && !state.drillJammed) {
    state.drillProgress += 20;
    if (state.drillProgress >= 100) {
      state.vaultOpened = true;
      state.gameMessage += ' [VAULT DOOR BREACHED! Deep chamber accessible.]';
    } else if (nextRand(state) < 0.35) {
      state.drillJammed = true;
      state.gameMessage += ' (Thermal drill jammed on reinforced tungsten plating!)';
    }
  }

  // Turn advance & passive suspicion
  state.turns += 1;
  if (state.empActiveTurns > 0) {
    state.empActiveTurns -= 1;
  } else {
    // If CCTV not looped in current zone, suspicion grows
    if (state.zone > 0 && !state.cctvLooped[state.zone]) {
      state.suspicion += 10;
    }
    // If drill running, noise raises suspicion
    if (state.drillDeployed && !state.vaultOpened) {
      state.suspicion += 8;
    }
  }

  if (state.suspicion >= 100 && !state.alarmTriggered) {
    state.alarmTriggered = true;
    state.gameMessage += ' [SECURITY ALERT! Alarm sirens blazing! SWAT dispatched.]';
  }

  // SWAT damage during alarm if not defending
  if (state.alarmTriggered && action !== 'action:defend_against_swat') {
    const assaultDmg = 10 + Math.floor(nextRand(state) * 10);
    state.crewHealth = Math.max(0, state.crewHealth - assaultDmg);
  }

  // Defeat checks
  if (state.crewHealth <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Crew overwhelmed and apprehended by SWAT tactical team.';
  } else if (state.turns >= state.maxTurns) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Metropolitan police blockaded all perimeter escape corridors.';
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
    ZONE_NAMES
  };
}
