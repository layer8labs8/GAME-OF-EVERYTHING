// 0158-fishing: Ocean Trawler - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const ZONE_NAMES = [
  'Port Estuary',
  'Coastal Reef',
  'Continental Shelf',
  'Abyssal Trench'
];

function totalFish(state) {
  const c = state.cargo;
  return c.mackerel + c.snapper + c.tuna + c.coelacanth;
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    currentZone: 0,
    hull: 100,
    fuel: 80,
    bait: 6,
    sonarCharge: 100,
    money: 240,
    cargoCapacity: 6,
    hasFreezer: false,
    sonarBonusActive: false,
    cargo: {
      mackerel: 0,
      snapper: 0,
      tuna: 0,
      coelacanth: 0
    },
    legendaryCaught: false,
    portDeliveries: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Trawler moored at Port Haven. Rig lines and chart a course for the fishing grounds.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.money;
  val += state.portDeliveries * 250;
  if (state.legendaryCaught) val += 1000;
  val += Math.floor(state.hull * 3);
  if (state.hasFreezer) val += 300;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];
  const currentCount = totalFish(state);

  // In Port (Zone 0)
  if (state.currentZone === 0) {
    actions.push('action:handline_dock_fishing');

    if (currentCount > 0) {
      actions.push('action:dock_and_auction_catch');
    }
    if (state.money >= 60 && (state.fuel < 100 || state.hull < 100)) {
      actions.push('action:refuel_and_repair');
    }
    if (state.money >= 35 && state.bait < 12) {
      actions.push('action:restock_bait_pots');
    }
    if (state.money >= 180 && !state.hasFreezer) {
      actions.push('action:install_flash_freezer');
    }
    if (state.money >= 120 && state.cargoCapacity < 18) {
      actions.push('action:expand_livewell_capacity');
    }
  }

  // At Sea (Zone > 0)
  if (state.currentZone > 0) {
    if (state.fuel < 8) {
      actions.push('action:coast_guard_tow');
    }
  }

  // Fishing operations
  if (currentCount < state.cargoCapacity) {
    if (state.bait >= 1 && state.fuel >= 4) {
      actions.push('action:cast_fishing_line');
    }
    if (state.fuel >= 14 && currentCount + 2 <= state.cargoCapacity) {
      actions.push('action:deploy_trawl_net');
    }
  }

  // Sonar
  if (state.sonarCharge >= 15 && !state.sonarBonusActive) {
    actions.push('action:ping_sonar_scanner');
  }

  // Navigation to adjacent zones
  if (state.currentZone > 0 && state.fuel >= 8) {
    actions.push('action:sail_to_zone:' + (state.currentZone - 1));
  }
  if (state.currentZone < 3 && state.fuel >= 10) {
    actions.push('action:sail_to_zone:' + (state.currentZone + 1));
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal fishing action "' + action + '" in current maritime state');
  }

  const oldScore = score(state);

  if (action === 'action:handline_dock_fishing') {
    state.money += 25;
    state.fuel = Math.min(100, state.fuel + 10);
    state.gameMessage = 'Handlined small mackerel from harbor pier. +$25 Cash, +10 Fuel.';
  } else if (action === 'action:coast_guard_tow') {
    state.currentZone = 0;
    state.money = Math.max(0, state.money - 50);
    for (const k of Object.keys(state.cargo)) {
      state.cargo[k] = Math.floor(state.cargo[k] / 2);
    }
    state.gameMessage = 'Coast Guard cutter towed adrift vessel to port. Salvage fees incurred.';
  } else if (action === 'action:refuel_and_repair') {
    state.money -= 60;
    state.fuel = Math.min(100, state.fuel + 45);
    state.hull = Math.min(100, state.hull + 35);
    state.sonarCharge = Math.min(100, state.sonarCharge + 40);
    state.gameMessage = 'Refueled tanks, caulked hull planks, and recharged sonar transducers.';
  } else if (action === 'action:restock_bait_pots') {
    state.money -= 35;
    state.bait = Math.min(12, state.bait + 4);
    state.gameMessage = 'Restocked squid and chum bait pots from dockside merchant.';
  } else if (action === 'action:install_flash_freezer') {
    state.money -= 180;
    state.hasFreezer = true;
    state.gameMessage = 'Installed cryogenic flash-freezer in the fish hold! Catch value boosted +25%.';
  } else if (action === 'action:expand_livewell_capacity') {
    state.money -= 120;
    state.cargoCapacity += 4;
    state.gameMessage = 'Expanded aerated livewell capacity to ' + state.cargoCapacity + ' crates.';
  } else if (action.startsWith('action:sail_to_zone:')) {
    const target = parseInt(action.split(':')[2], 10);
    state.fuel = Math.max(0, state.fuel - 10);
    state.currentZone = target;
    state.gameMessage = 'Steered trawler toward ' + ZONE_NAMES[target] + '.';
  } else if (action === 'action:ping_sonar_scanner') {
    state.sonarCharge -= 15;
    state.sonarBonusActive = true;
    state.gameMessage = 'Transducer echo-pinged sea floor! Located high-yield trophy school.';
  } else if (action === 'action:cast_fishing_line') {
    state.bait -= 1;
    state.fuel = Math.max(0, state.fuel - 4);

    if (state.currentZone === 0) {
      state.cargo.mackerel += 1;
    } else if (state.currentZone === 1) {
      state.cargo.snapper += 1;
    } else if (state.currentZone === 2) {
      state.cargo.tuna += 1;
    } else if (state.currentZone === 3) {
      if (state.sonarBonusActive || nextRand(state) < 0.45) {
        state.cargo.coelacanth += 1;
        state.legendaryCaught = true;
        state.sonarBonusActive = false;
        state.gameMessage = 'STRIKE! Hauled aboard the Legendary Abyssal Coelacanth! What a trophy!';
      } else {
        state.cargo.tuna += 1;
      }
    }
    if (state.currentZone < 3) {
      state.sonarBonusActive = false;
      state.gameMessage = 'Reeled in prize catch from ' + ZONE_NAMES[state.currentZone] + '!';
    }
  } else if (action === 'action:deploy_trawl_net') {
    state.fuel = Math.max(0, state.fuel - 14);
    const count = Math.min(2, state.cargoCapacity - totalFish(state));

    if (state.currentZone === 0) {
      state.cargo.mackerel += count;
    } else if (state.currentZone === 1) {
      state.cargo.snapper += count;
    } else if (state.currentZone === 2) {
      state.cargo.tuna += count;
    } else if (state.currentZone === 3) {
      state.cargo.tuna += 1;
      state.cargo.coelacanth += (count - 1);
      if (state.cargo.coelacanth > 0) state.legendaryCaught = true;
    }
    state.sonarBonusActive = false;
    state.gameMessage = 'Wenched heavy trawl net aboard with ' + count + ' crates of fish!';
  } else if (action === 'action:dock_and_auction_catch') {
    const c = state.cargo;
    let subtotal = c.mackerel * 30 + c.snapper * 85 + c.tuna * 230 + c.coelacanth * 900;
    if (state.hasFreezer) {
      subtotal = Math.floor(subtotal * 1.25);
    }
    state.money += subtotal;
    state.portDeliveries += 1;
    state.cargo = { mackerel: 0, snapper: 0, tuna: 0, coelacanth: 0 };
    state.gameMessage = 'Auctioned haul at Port Haven market! Earned $' + subtotal + ' payout.';
  }

  // Turn advance & Ocean weather hazards
  state.turns += 1;

  if (state.currentZone >= 2) {
    const swell = nextRand(state);
    if (swell < 0.20) {
      state.hull = Math.max(0, state.hull - 15);
      state.gameMessage += ' (Warning: Gale-force squall battered the hull! -15 Seaworthiness.)';
    }
  }

  // Win / Loss evaluation
  if (state.legendaryCaught && state.portDeliveries >= 6 && state.money >= 3500) {
    state.victory = true;
    state.gameMessage = 'Victory! Celebrated Master Trawler Captain! The Legendary Coelacanth is in the hall of fame.';
  } else if (state.hull <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Hull breached! The trawler foundered beneath the waves.';
  } else if (state.fuel <= 0 && state.currentZone > 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Stranded adrift in open sea with zero fuel reserves.';
  } else if (state.turns >= state.maxTurns) {
    if (state.legendaryCaught && state.money >= 2500) {
      state.victory = true;
      state.gameMessage = 'Victory: Commercial season concluded with record-breaking fishery profits!';
    } else {
      state.gameMessage = 'Commercial fishing season concluded.';
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
    totalFish,
    ZONE_NAMES
  };
}
