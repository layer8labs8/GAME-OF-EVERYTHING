// 0167-idler: Stellar Reactor Idler - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

const GENERATOR_TYPES = ['solenoid', 'injector', 'tokamak', 'antimatterCore', 'dysonRelay'];

const BASE_COSTS = {
  solenoid: { energy: 15, neutrons: 0 },
  injector: { energy: 75, neutrons: 0 },
  tokamak: { energy: 320, neutrons: 8 },
  antimatterCore: { energy: 1500, neutrons: 25 },
  dysonRelay: { energy: 7500, neutrons: 80 }
};

const BASE_YIELDS = {
  solenoid: { energy: 2, neutrons: 0 },
  injector: { energy: 10, neutrons: 0.5 },
  tokamak: { energy: 45, neutrons: 2 },
  antimatterCore: { energy: 220, neutrons: 8 },
  dysonRelay: { energy: 1000, neutrons: 35 }
};

function getGeneratorCost(type, count) {
  const base = BASE_COSTS[type];
  const mult = Math.pow(1.15, count);
  return {
    energy: Math.floor(base.energy * mult),
    neutrons: Math.floor(base.neutrons * mult)
  };
}

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
    energy: 25,
    neutrons: 0,
    darkMatter: 0,
    coreTemp: 20,
    overclockTurns: 0,
    generators: {
      solenoid: 0,
      injector: 0,
      tokamak: 0,
      antimatterCore: 0,
      dysonRelay: 0
    },
    prestigeCount: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Stellar fusion containment online. Construct solenoids and manage core temperature.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = Math.floor(state.energy / 50);
  val += Math.floor(state.neutrons * 20);
  val += state.darkMatter * 1000;
  val += state.generators.solenoid * 30;
  val += state.generators.injector * 120;
  val += state.generators.tokamak * 500;
  val += state.generators.antimatterCore * 2000;
  val += state.generators.dysonRelay * 8000;
  if (state.victory) val += 10000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Manual core pulse is always legal
  actions.push('action:pulse_reactor_core');

  // Coolant cycle is always accessible
  actions.push('action:cycle_cryo_coolant');

  // Overclock if cool enough
  if (state.coreTemp < 80 && state.overclockTurns === 0) {
    actions.push('action:engage_plasma_overclock');
  }

  // Purchasing generators
  for (const type of GENERATOR_TYPES) {
    const cost = getGeneratorCost(type, state.generators[type]);
    if (state.energy >= cost.energy && state.neutrons >= cost.neutrons) {
      actions.push('action:purchase_generator:' + type);
    }
  }

  // Quantum Overdrive Prestige
  if (state.neutrons >= 80) {
    actions.push('action:quantum_overdrive_prestige');
  }

  // Victory Condition
  if (state.generators.dysonRelay >= 1 && state.darkMatter >= 2 && state.energy >= 20000) {
    actions.push('action:achieve_stellar_ignition');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal idler action "' + action + '" in current state');
  }

  const oldScore = score(state);

  const dmMult = 1 + state.darkMatter * 0.5;

  if (action === 'action:pulse_reactor_core') {
    const gain = Math.floor(6 * dmMult);
    state.energy += gain;
    state.coreTemp = Math.min(100, state.coreTemp + 3);
    state.gameMessage = 'Triggered manual plasma pulse: +' + gain + ' Energy generated.';
  } else if (action === 'action:cycle_cryo_coolant') {
    state.coreTemp = Math.max(10, state.coreTemp - 35);
    state.gameMessage = 'Circulated sub-zero cryogenic helium. Core temperature dropped 35%.';
  } else if (action === 'action:engage_plasma_overclock') {
    state.overclockTurns = 4;
    state.coreTemp = Math.min(100, state.coreTemp + 18);
    state.gameMessage = 'Engaged plasma magnetic overdrive! Energy and neutron output doubled for 4 turns.';
  } else if (action.startsWith('action:purchase_generator:')) {
    const type = action.split(':')[2];
    const cost = getGeneratorCost(type, state.generators[type]);
    state.energy -= cost.energy;
    state.neutrons -= cost.neutrons;
    state.generators[type] += 1;
    state.gameMessage = 'Constructed ' + type + ' module (Total: ' + state.generators[type] + ').';
  } else if (action === 'action:quantum_overdrive_prestige') {
    state.prestigeCount += 1;
    state.darkMatter += 1;
    state.energy = 50;
    state.neutrons = 0;
    state.coreTemp = 20;
    state.overclockTurns = 0;
    state.generators.solenoid = 0;
    state.generators.injector = 0;
    state.generators.tokamak = 0;
    state.generators.antimatterCore = 0;
    state.generators.dysonRelay = 0;
    state.gameMessage = 'QUANTUM COLLAPSE! Harvested Dark Matter Shard (+50% permanent production boost).';
  } else if (action === 'action:achieve_stellar_ignition') {
    state.victory = true;
    state.gameMessage = 'VICTORY! Dyson Sphere reached critical stellar ignition! Galaxy illuminated!';
  }

  // Automated Idle Generation Step
  let idleEnergy = 0;
  let idleNeutrons = 0;

  for (const type of GENERATOR_TYPES) {
    const count = state.generators[type];
    if (count > 0) {
      idleEnergy += count * BASE_YIELDS[type].energy;
      idleNeutrons += count * BASE_YIELDS[type].neutrons;
    }
  }

  // Thermal bonus (between 50% and 90% coreTemp)
  let thermalMult = 1.0;
  if (state.coreTemp >= 50 && state.coreTemp <= 90) {
    thermalMult = 1.5;
  }

  const ocMult = state.overclockTurns > 0 ? 2.0 : 1.0;
  if (state.overclockTurns > 0) state.overclockTurns -= 1;

  const totalEnergyYield = Math.floor(idleEnergy * dmMult * thermalMult * ocMult);
  const totalNeutronYield = Math.floor(idleNeutrons * dmMult * ocMult);

  state.energy += totalEnergyYield;
  state.neutrons += totalNeutronYield;

  // Thermal dissipation / heating
  const activeGenCount = state.generators.solenoid + state.generators.injector * 2 + state.generators.tokamak * 4 + state.generators.antimatterCore * 8 + state.generators.dysonRelay * 15;
  const heatGen = Math.min(15, Math.floor(activeGenCount / 3));
  state.coreTemp = Math.min(100, Math.max(10, state.coreTemp + heatGen - 4));

  state.turns += 1;

  // Meltdown & max turns defeat
  if (state.coreTemp >= 100) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Reactor core containment meltdown! Plasma breached the crust.';
  } else if (state.turns >= state.maxTurns && !state.victory) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Operational cycle time elapsed before achieving Stellar Ignition.';
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
    GENERATOR_TYPES,
    BASE_COSTS,
    BASE_YIELDS,
    getGeneratorCost
  };
}
