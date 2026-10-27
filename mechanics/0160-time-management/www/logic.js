// 0160-time-management: Grand Hotel Rush - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const GUEST_NAMES = [
  'Lord Sterling',
  'Madame Vivienne',
  'Ambassador Chen',
  'Duchess Eleanor',
  'Baron Von Klaus',
  'Countess Sofia'
];

function spawnGuest(state) {
  const nameIdx = Math.floor(nextRand(state) * GUEST_NAMES.length);
  const guest = {
    id: 'g_' + state.nextGuestId++,
    name: GUEST_NAMES[nameIdx],
    stage: 0, // 0: check-in, 1: luggage, 2: room service, 3: checkout
    roomId: null,
    patience: 15,
    reward: 180
  };
  state.guests.push(guest);
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    energy: 90,
    capital: 350,
    reputation: 80,
    rooms: [
      { id: 1, status: 'clean', guestId: null },
      { id: 2, status: 'clean', guestId: null },
      { id: 3, status: 'clean', guestId: null },
      { id: 4, status: 'clean', guestId: null }
    ],
    guests: [],
    upgrades: {
      hasAssistantBellhop: false,
      hasExpressMaid: false
    },
    nextGuestId: 1,
    servedGuests: 0,
    walkouts: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Grand Hotel lobby open! Welcome arriving travelers.'
  };

  spawnGuest(state);
  spawnGuest(state);

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.capital;
  val += state.servedGuests * 200;
  val += state.reputation * 15;
  val -= state.walkouts * 200;
  if (state.upgrades.hasAssistantBellhop) val += 250;
  if (state.upgrades.hasExpressMaid) val += 250;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Utilities
  actions.push('action:manager_espresso_break');

  if (state.capital >= 30) {
    actions.push('action:serve_welcome_cocktails');
  }

  // Upgrades
  if (state.capital >= 200 && !state.upgrades.hasAssistantBellhop) {
    actions.push('action:hire_assistant_bellhop');
  }
  if (state.capital >= 220 && !state.upgrades.hasExpressMaid) {
    actions.push('action:hire_express_maid');
  }

  // Housekeeping room cleaning
  for (const rm of state.rooms) {
    if (rm.status === 'dirty' && state.energy >= (state.upgrades.hasExpressMaid ? 5 : 10)) {
      actions.push('action:clean_vacant_room:' + rm.id);
    }
  }

  // Guest actions
  const hasCleanRoom = state.rooms.some(r => r.status === 'clean');

  for (const g of state.guests) {
    if (g.stage === 0) {
      if (hasCleanRoom && state.energy >= 10) {
        actions.push('action:check_in_guest:' + g.id);
      }
    } else if (g.stage === 1) {
      const bellhopEnergy = state.upgrades.hasAssistantBellhop ? 4 : 8;
      if (state.energy >= bellhopEnergy) {
        actions.push('action:dispatch_bellhop:' + g.id);
      }
    } else if (g.stage === 2) {
      if (state.energy >= 12) {
        actions.push('action:deliver_room_service:' + g.id);
      }
    } else if (g.stage === 3) {
      actions.push('action:checkout_guest:' + g.id);
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
    throw new Error('Illegal hospitality action "' + action + '" in current hotel state');
  }

  const oldScore = score(state);

  if (action === 'action:manager_espresso_break') {
    state.energy = Math.min(100, state.energy + 35);
    state.gameMessage = 'Sipped double espresso in manager office. Energy restored.';
  } else if (action === 'action:serve_welcome_cocktails') {
    state.capital -= 30;
    for (const g of state.guests) {
      g.patience = Math.min(20, g.patience + 5);
    }
    state.gameMessage = 'Served complimentary champagne in the lobby! Guest patience boosted.';
  } else if (action === 'action:hire_assistant_bellhop') {
    state.capital -= 200;
    state.upgrades.hasAssistantBellhop = true;
    state.gameMessage = 'Hired Assistant Bellhop! Luggage dispatch now requires 50% less energy.';
  } else if (action === 'action:hire_express_maid') {
    state.capital -= 220;
    state.upgrades.hasExpressMaid = true;
    state.gameMessage = 'Hired Express Maid! Room turnover cleaning is now ultra fast.';
  } else if (action.startsWith('action:clean_vacant_room:')) {
    const rId = parseInt(action.split(':')[2], 10);
    const rm = state.rooms.find(r => r.id === rId);
    state.energy = Math.max(0, state.energy - (state.upgrades.hasExpressMaid ? 5 : 10));
    rm.status = 'clean';
    state.gameMessage = 'Housekeeping polished Suite #' + rId + ' to immaculate 5-star standard!';
  } else if (action.startsWith('action:check_in_guest:')) {
    const gId = action.split(':')[2];
    const g = state.guests.find(x => x.id === gId);
    const cleanRoom = state.rooms.find(r => r.status === 'clean');
    cleanRoom.status = 'occupied';
    cleanRoom.guestId = g.id;
    g.roomId = cleanRoom.id;
    g.stage = 1;
    g.patience = Math.min(20, g.patience + 4);
    state.energy = Math.max(0, state.energy - 10);
    state.gameMessage = 'Assigned keycard for Suite #' + cleanRoom.id + ' to ' + g.name + '.';
  } else if (action.startsWith('action:dispatch_bellhop:')) {
    const gId = action.split(':')[2];
    const g = state.guests.find(x => x.id === gId);
    const cost = state.upgrades.hasAssistantBellhop ? 4 : 8;
    state.energy = Math.max(0, state.energy - cost);
    g.stage = 2;
    g.patience = Math.min(20, g.patience + 5);
    state.gameMessage = 'Bellhop delivered luggage cart to Suite #' + g.roomId + '.';
  } else if (action.startsWith('action:deliver_room_service:')) {
    const gId = action.split(':')[2];
    const g = state.guests.find(x => x.id === gId);
    state.energy = Math.max(0, state.energy - 12);
    g.stage = 3;
    g.patience = Math.min(20, g.patience + 6);
    state.gameMessage = 'Delivered culinary room service tray to Suite #' + g.roomId + '.';
  } else if (action.startsWith('action:checkout_guest:')) {
    const gId = action.split(':')[2];
    const gIdx = state.guests.findIndex(x => x.id === gId);
    const g = state.guests[gIdx];
    const rm = state.rooms.find(r => r.id === g.roomId);
    if (rm) {
      rm.status = 'dirty';
      rm.guestId = null;
    }
    const tip = g.patience >= 8 ? 50 : 0;
    state.capital += g.reward + tip;
    state.reputation = Math.min(100, state.reputation + (g.patience >= 8 ? 5 : 2));
    state.servedGuests += 1;
    state.gameMessage = g.name + ' checked out delighted! Settled $' + (g.reward + tip) + ' bill and gratuity.';
    state.guests.splice(gIdx, 1);
  }

  // Turn advance & Patience decay
  state.turns += 1;

  for (let i = state.guests.length - 1; i >= 0; i--) {
    state.guests[i].patience -= 1;
    if (state.guests[i].patience <= 0) {
      state.walkouts += 1;
      state.reputation = Math.max(0, state.reputation - 15);
      if (state.guests[i].roomId) {
        const rm = state.rooms.find(r => r.id === state.guests[i].roomId);
        if (rm) {
          rm.status = 'dirty';
          rm.guestId = null;
        }
      }
      state.gameMessage = 'Disgruntled guest ' + state.guests[i].name + ' stormed out after delay! -15% Reputation.';
      state.guests.splice(i, 1);
    }
  }

  // Replenish guests
  if (state.guests.length < 3 && nextRand(state) < 0.55) {
    spawnGuest(state);
  }
  if (state.guests.length === 0) {
    spawnGuest(state);
  }

  // Win / Loss evaluation
  if (state.servedGuests >= 15 && state.reputation >= 85 && state.capital >= 3000) {
    state.victory = true;
    state.gameMessage = 'Victory! Grand Hotel crowned World Hospitality Leader with 5-star perfection!';
  } else if (state.walkouts >= 5) {
    state.defeat = true;
    state.gameMessage = 'Defeat: 5 angry guest walkouts! Tourist board revoked hotel operating license.';
  } else if (state.reputation <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Zero reputation! Hotel shut down in public disgrace.';
  } else if (state.turns >= state.maxTurns) {
    if (state.servedGuests >= 12 && state.capital >= 2200) {
      state.victory = true;
      state.gameMessage = 'Victory: Fiscal tourist season concluded with stellar 5-star hotel performance!';
    } else {
      state.gameMessage = 'Hotel operating season concluded.';
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
    score
  };
}
