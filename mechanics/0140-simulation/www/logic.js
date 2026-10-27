/**
 * 0140-simulation: Biosphere Genesis
 * Pure planetary terraforming simulation engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;

const LIFE_STAGE_NAMES = [
  'Barren Crust',
  'Primordial Microbes',
  'Lichen & Sylvan Flora',
  'Terrestrial Fauna',
  'Thriving Biosphere'
];

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 1) {
  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    epoch: 1,
    energy: 30,
    maxEnergy: 30,
    temperature: -25,
    oxygen: 1,
    moisture: 8,
    co2: 35,
    biomass: 0,
    lifeStage: 0,
    stableEpochs: 0,
    score: 10,
    done: false,
    victory: false,
    log: [
      'Biosphere Genesis engine initialized for proto-planet Aethel-Prime.',
      'Atmosphere currently sub-zero and desiccated. Begin terraforming.'
    ]
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function addLog(state, line) {
  state.log.push(line);
  if (state.log.length > 20) {
    state.log.shift();
  }
}

function isGoldenZone(state) {
  return (
    state.temperature >= 15 && state.temperature <= 25 &&
    state.oxygen >= 18 && state.oxygen <= 24 &&
    state.moisture >= 40 && state.moisture <= 70
  );
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Interventions requiring 10 energy
  if (state.energy >= 10) {
    actions.push('action:deploy_comet_ice');
    actions.push('action:ignite_thermal_vents');
    actions.push('action:orbital_sunshade');

    if (state.moisture >= 15) {
      actions.push('action:seed_cyanobacteria');
    }
    if (state.moisture >= 25 && state.temperature >= -5 && state.lifeStage >= 1) {
      actions.push('action:seed_flora');
    }
    if (state.oxygen >= 15 && state.lifeStage >= 2) {
      actions.push('action:introduce_fauna');
    }
  }

  // Advance simulation cycle
  actions.push('action:advance_epoch');

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Simulation has already concluded.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Deploy Comet Ice
  if (action === 'action:deploy_comet_ice') {
    state.energy -= 10;
    state.moisture = Math.min(100, state.moisture + 15);
    state.temperature -= 3;
    state.co2 = Math.min(100, state.co2 + 4);
    reward += 5;
    state.score += 15;
    addLog(state, 'Comet Ice impact orchestrated: +15% Moisture, -3°C Temperature, +4% CO2.');
  }

  // Ignite Thermal Vents
  else if (action === 'action:ignite_thermal_vents') {
    state.energy -= 10;
    state.temperature += 10;
    state.co2 = Math.min(100, state.co2 + 8);
    reward += 5;
    state.score += 15;
    addLog(state, 'Volcanic mantle vents breached: +10°C Greenhouse Warming, +8% CO2.');
  }

  // Orbital Sunshade
  else if (action === 'action:orbital_sunshade') {
    state.energy -= 10;
    state.temperature -= 8;
    reward += 4;
    state.score += 10;
    addLog(state, 'Orbital refractive sunshade deployed: -8°C Global Cooling.');
  }

  // Seed Cyanobacteria
  else if (action === 'action:seed_cyanobacteria') {
    state.energy -= 10;
    state.oxygen = Math.min(100, state.oxygen + 6);
    state.co2 = Math.max(0, state.co2 - 7);
    state.biomass = Math.min(100, state.biomass + 15);
    if (state.lifeStage === 0) {
      state.lifeStage = 1;
      state.score += 25;
      reward += 15;
      addLog(state, 'EVOLUTIONARY MILESTONE: Primordial Cyanobacteria colony successfully established!');
    } else {
      reward += 6;
      state.score += 15;
      addLog(state, 'Cyanobacteria bloom expanded: +6% Oxygen, -7% CO2.');
    }
  }

  // Seed Flora
  else if (action === 'action:seed_flora') {
    state.energy -= 10;
    state.oxygen = Math.min(100, state.oxygen + 8);
    state.co2 = Math.max(0, state.co2 - 8);
    state.moisture = Math.min(100, state.moisture + 5);
    state.biomass = Math.min(100, state.biomass + 25);
    if (state.lifeStage < 2) {
      state.lifeStage = 2;
      state.score += 35;
      reward += 20;
      addLog(state, 'EVOLUTIONARY MILESTONE: Continental Lichen & Sylvan Forests blanket the landscape!');
    } else {
      reward += 8;
      state.score += 20;
      addLog(state, 'Forest biomes enriched: +8% Oxygen, -8% CO2, +25 Biomass.');
    }
  }

  // Introduce Fauna
  else if (action === 'action:introduce_fauna') {
    state.energy -= 10;
    state.biomass = Math.min(100, state.biomass + 30);
    if (state.lifeStage < 3) {
      state.lifeStage = 3;
      state.score += 45;
      reward += 25;
      addLog(state, 'EVOLUTIONARY MILESTONE: Terrestrial Fauna introduced into dynamic food webs!');
    } else {
      reward += 8;
      state.score += 20;
      addLog(state, 'Fauna populations diversified: +30 Ecological Biomass.');
    }
  }

  // Advance Epoch Cycle
  else if (action === 'action:advance_epoch') {
    state.epoch += 1;
    state.energy = state.maxEnergy;

    // Climate feedback loop: temperature equilibrates toward greenhouse balance
    const targetTemp = Math.round(state.co2 * 0.7 - 8);
    if (state.temperature < targetTemp) {
      state.temperature += 2;
    } else if (state.temperature > targetTemp) {
      state.temperature -= 2;
    }

    // Evaluate Golden Zone equilibrium
    const golden = isGoldenZone(state);
    if (golden) {
      state.stableEpochs += 1;
      reward += 15;
      state.score += 30;
      addLog(state, `EPOCH ${state.epoch}: Planetary Equilibrium within Golden Zone! (Stability: ${state.stableEpochs}/3)`);

      if (state.lifeStage >= 3 && state.biomass >= 60) {
        state.lifeStage = 4;
      }

      // Victory Condition
      if (state.stableEpochs >= 3 && state.lifeStage === 4) {
        state.victory = true;
        state.done = true;
        reward += 100;
        state.score += 150;
        addLog(state, 'GENESIS TRANSCENDENCE: Aethel-Prime is now a Self-Sustaining Living Paradise!');
        return { reward, done: true };
      }
    } else {
      state.stableEpochs = 0;
      addLog(state, `EPOCH ${state.epoch}: Climate fluctuating outside optimal stability bands.`);
    }
  }

  // Safety Turn limit
  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Simulation timeframe threshold elapsed.');
  }

  return { reward, done: state.done };
}

// Module export for Node.js test runners & Bot checkers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_TURNS,
    LIFE_STAGE_NAMES,
    isGoldenZone
  };
}
