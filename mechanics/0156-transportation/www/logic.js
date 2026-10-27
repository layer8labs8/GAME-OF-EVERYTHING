// 0156-transportation: Transit Flow - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const CONTRACT_TEMPLATES = [
  { from: 'Valley', to: 'Metro', cargo: 'Fresh Grain & Produce', amount: 3, deadline: 18, reward: 220 },
  { from: 'Industrial', to: 'Harbor', cargo: 'Structural Steel Beams', amount: 4, deadline: 16, reward: 280 },
  { from: 'Harbor', to: 'Airport', cargo: 'High-Tech Microchips', amount: 2, deadline: 15, reward: 240 },
  { from: 'Industrial', to: 'Metro', cargo: 'Heavy Transit Machinery', amount: 3, deadline: 17, reward: 250 },
  { from: 'Valley', to: 'Harbor', cargo: 'Packaged Organic Foodstuffs', amount: 3, deadline: 18, reward: 260 }
];

const POSSIBLE_CORRIDORS = [
  'Valley-Metro',
  'Industrial-Metro',
  'Industrial-Harbor',
  'Harbor-Airport',
  'Valley-Industrial',
  'Metro-Airport'
];

function isConnected(state, from, to) {
  const p1 = from + '-' + to;
  const p2 = to + '-' + from;
  const hasRail = state.connections.rail.includes(p1) || state.connections.rail.includes(p2);
  const hasRoad = state.connections.road.includes(p1) || state.connections.road.includes(p2);
  return hasRail || hasRoad;
}

function spawnContract(state) {
  const idx = Math.floor(nextRand(state) * CONTRACT_TEMPLATES.length);
  const tpl = CONTRACT_TEMPLATES[idx];
  const contract = {
    id: 'ct_' + state.nextContractId++,
    from: tpl.from,
    to: tpl.to,
    cargo: tpl.cargo,
    amount: tpl.amount,
    deadlineTurns: tpl.deadline,
    reward: tpl.reward
  };
  state.contracts.push(contract);
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    capital: 500,
    reputation: 75,
    congestion: 15,
    fuel: 70,
    fleet: {
      trains: 1,
      trucks: 2,
      capacity: 8
    },
    connections: {
      rail: ['Valley-Metro'],
      road: ['Industrial-Metro']
    },
    contracts: [],
    nextContractId: 1,
    contractsCompleted: 0,
    contractsFailed: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Regional transit network initialized. Connect corridors and deliver freight!'
  };

  spawnContract(state);
  spawnContract(state);

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.capital;
  val += state.contractsCompleted * 200;
  val += state.reputation * 15;
  val += state.fleet.capacity * 25;
  val -= state.congestion * 10;
  val -= state.contractsFailed * 150;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Routine local dispatch is always available
  actions.push('action:routine_dispatch');

  // Fleet expansion
  if (state.capital >= 150) {
    actions.push('action:purchase_freight_train');
  }
  if (state.capital >= 75) {
    actions.push('action:purchase_cargo_truck');
  }

  // Refuel & Signal maintenance
  if (state.capital >= 50 && state.fuel < 100) {
    actions.push('action:refuel_fleet');
  }
  if (state.capital >= 40 && state.congestion > 0) {
    actions.push('action:optimize_traffic_signals');
  }

  // Infrastructure construction
  for (const pair of POSSIBLE_CORRIDORS) {
    const rev = pair.split('-').reverse().join('-');
    const hasRail = state.connections.rail.includes(pair) || state.connections.rail.includes(rev);
    const hasRoad = state.connections.road.includes(pair) || state.connections.road.includes(rev);

    if (!hasRail && state.capital >= 120) {
      actions.push('action:build_rail:' + pair);
    }
    if (!hasRoad && state.capital >= 80) {
      actions.push('action:pave_road:' + pair);
    }
  }

  // Contract fulfillment
  for (const c of state.contracts) {
    if (isConnected(state, c.from, c.to) && state.fuel >= 12) {
      actions.push('action:fulfill_contract:' + c.id);
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
    throw new Error('Illegal transport action "' + action + '" in current logistics state');
  }

  const oldScore = score(state);

  if (action === 'action:routine_dispatch') {
    state.capital += 45;
    state.fuel = Math.max(0, state.fuel - 5);
    state.congestion = Math.min(100, state.congestion + 2);
    state.gameMessage = 'Dispatched short-haul local logistics. Earned $45 revenue.';
  } else if (action === 'action:purchase_freight_train') {
    state.capital -= 150;
    state.fleet.trains += 1;
    state.fleet.capacity += 4;
    state.gameMessage = 'Purchased heavy freight locomotive! Network capacity expanded to ' + state.fleet.capacity + ' tons.';
  } else if (action === 'action:purchase_cargo_truck') {
    state.capital -= 75;
    state.fleet.trucks += 1;
    state.fleet.capacity += 2;
    state.gameMessage = 'Added express delivery truck! Network capacity expanded to ' + state.fleet.capacity + ' tons.';
  } else if (action === 'action:refuel_fleet') {
    state.capital -= 50;
    state.fuel = Math.min(100, state.fuel + 45);
    state.gameMessage = 'Refilled central diesel and battery depots. Fuel restored to ' + state.fuel + ' units.';
  } else if (action === 'action:optimize_traffic_signals') {
    state.capital -= 40;
    state.congestion = Math.max(0, state.congestion - 25);
    state.gameMessage = 'Optimized computerized rail and highway dispatch. Congestion lowered to ' + state.congestion + '%.';
  } else if (action.startsWith('action:build_rail:')) {
    const pair = action.split(':')[2];
    state.capital -= 120;
    state.connections.rail.push(pair);
    state.gameMessage = 'Constructed heavy rail track corridor connecting ' + pair + '!';
  } else if (action.startsWith('action:pave_road:')) {
    const pair = action.split(':')[2];
    state.capital -= 80;
    state.connections.road.push(pair);
    state.gameMessage = 'Paved high-speed freight highway connecting ' + pair + '!';
  } else if (action.startsWith('action:fulfill_contract:')) {
    const contractId = action.split(':')[2];
    const cIdx = state.contracts.findIndex(x => x.id === contractId);
    if (cIdx >= 0) {
      const c = state.contracts[cIdx];
      state.fuel = Math.max(0, state.fuel - 12);
      state.capital += c.reward;
      state.reputation = Math.min(100, state.reputation + 8);
      state.congestion = Math.min(100, state.congestion + 4);
      state.contractsCompleted += 1;
      state.gameMessage = 'Successfully hauled ' + c.cargo + ' from ' + c.from + ' to ' + c.to + '! Collected $' + c.reward + ' payout.';
      state.contracts.splice(cIdx, 1);
    }
  }

  // Turn advance & contract deadlines
  state.turns += 1;

  for (let i = state.contracts.length - 1; i >= 0; i--) {
    state.contracts[i].deadlineTurns -= 1;
    if (state.contracts[i].deadlineTurns <= 0) {
      state.contractsFailed += 1;
      state.reputation = Math.max(0, state.reputation - 15);
      state.congestion = Math.min(100, state.congestion + 8);
      state.gameMessage = 'Defaulted on delivery contract for ' + state.contracts[i].cargo + '! Reputation penalized.';
      state.contracts.splice(i, 1);
    }
  }

  // Replenish contracts
  if (state.contracts.length < 3 && nextRand(state) < 0.55) {
    spawnContract(state);
  }
  if (state.contracts.length === 0) {
    spawnContract(state);
  }

  // Win / Loss evaluation
  if (state.contractsCompleted >= 12 && state.reputation >= 85 && state.capital >= 3000) {
    state.victory = true;
    state.gameMessage = 'Victory! Crowned Regional Logistics Titan with premier multimodal transport network!';
  } else if (state.capital < -100) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Corporate insolvency! Creditors seized transit assets.';
  } else if (state.congestion >= 100) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Gridlock catastrophe! The metropolitan transport network has seized.';
  } else if (state.contractsFailed >= 5) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Transport operating charter revoked after 5 contract defaults.';
  } else if (state.turns >= state.maxTurns) {
    if (state.contractsCompleted >= 10 && state.capital >= 2000) {
      state.victory = true;
      state.gameMessage = 'Victory: Transit franchise concluded with outstanding annual performance!';
    } else {
      state.gameMessage = 'Franchise operating period concluded.';
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
    POSSIBLE_CORRIDORS
  };
}
