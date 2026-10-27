/**
 * 0142-resource-management: Star Foundry
 * Pure industrial supply chain and logistics simulation engine conforming to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 120;

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRng(state) {
  let s = (state.prngState >>> 0) || 123456789;
  s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.prngState = s;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function generateContract(tier, rngFn) {
  const alloyReq = 4 + tier * 3 + Math.floor(rngFn() * 3);
  const polymerReq = 3 + tier * 2 + Math.floor(rngFn() * 3);
  const circuitReq = 1 + tier * 2 + Math.floor(rngFn() * 2);
  const reward = 300 + tier * 350 + (alloyReq * 15) + (polymerReq * 18) + (circuitReq * 45);

  return {
    id: tier,
    targetAlloy: alloyReq,
    targetPolymer: polymerReq,
    targetCircuit: circuitReq,
    rewardCredits: reward
  };
}

function createState(seed = 1) {
  const rng = createPrng(seed);
  const initialContract = generateContract(1, rng);

  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    cycle: 1,
    credits: 500,
    contractsCompleted: 0,
    resources: {
      ore: 10,
      gas: 10,
      alloy: 0,
      polymer: 0,
      circuit: 0
    },
    facilities: {
      miners: 1,
      extractors: 1,
      smelters: 1,
      refineries: 1,
      fabricators: 0,
      solar: 2
    },
    currentContract: initialContract,
    score: 0,
    done: false,
    victory: false,
    log: [
      'Star Foundry orbital platform established in asteroid sector.',
      'Construct extraction, refining, and power infrastructure to fulfill galactic quotas.'
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

function calculatePower(state) {
  const supply = state.facilities.solar * 4;
  const demand = state.facilities.miners * 1 +
                 state.facilities.extractors * 1 +
                 state.facilities.smelters * 1 +
                 state.facilities.refineries * 1 +
                 state.facilities.fabricators * 2;
  return { supply, demand, balance: supply - demand };
}

function canFulfillContract(state) {
  const c = state.currentContract;
  return (
    state.resources.alloy >= c.targetAlloy &&
    state.resources.polymer >= c.targetPolymer &&
    state.resources.circuit >= c.targetCircuit
  );
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const creds = state.credits;

  // Infrastructure expansion
  if (creds >= 100 && state.facilities.miners < 8) {
    actions.push('action:build_miner');
  }
  if (creds >= 100 && state.facilities.extractors < 8) {
    actions.push('action:build_extractor');
  }
  if (creds >= 150 && state.facilities.smelters < 6) {
    actions.push('action:build_smelter');
  }
  if (creds >= 150 && state.facilities.refineries < 6) {
    actions.push('action:build_refinery');
  }
  if (creds >= 220 && state.facilities.fabricators < 5) {
    actions.push('action:build_fabricator');
  }
  if (creds >= 120 && state.facilities.solar < 10) {
    actions.push('action:build_solar');
  }

  // Fulfill galactic quota
  if (canFulfillContract(state)) {
    actions.push('action:fulfill_contract');
  }

  // Logistics simulation step (Always legal to advance manufacturing cycle)
  actions.push('action:cycle_logistics');

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Simulation is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Build Actions
  if (action === 'action:build_miner') {
    state.credits -= 100;
    state.facilities.miners += 1;
    reward += 5;
    state.score += 10;
    addLog(state, `Deployed Asteroid Mining Drill (Total Drills: ${state.facilities.miners}).`);
  } else if (action === 'action:build_extractor') {
    state.credits -= 100;
    state.facilities.extractors += 1;
    reward += 5;
    state.score += 10;
    addLog(state, `Deployed Nebula Gas Extractor (Total Extractors: ${state.facilities.extractors}).`);
  } else if (action === 'action:build_smelter') {
    state.credits -= 150;
    state.facilities.smelters += 1;
    reward += 8;
    state.score += 15;
    addLog(state, `Constructed Electric Arc Smelter (Total Smelters: ${state.facilities.smelters}).`);
  } else if (action === 'action:build_refinery') {
    state.credits -= 150;
    state.facilities.refineries += 1;
    reward += 8;
    state.score += 15;
    addLog(state, `Constructed Polymer Synthesis Plant (Total Refineries: ${state.facilities.refineries}).`);
  } else if (action === 'action:build_fabricator') {
    state.credits -= 220;
    state.facilities.fabricators += 1;
    reward += 12;
    state.score += 25;
    addLog(state, `Assembled Microcircuit Fabricator (Total Fabricators: ${state.facilities.fabricators}).`);
  } else if (action === 'action:build_solar') {
    state.credits -= 120;
    state.facilities.solar += 1;
    reward += 6;
    state.score += 12;
    addLog(state, `Expanded Orbital Solar Array (+4 MW Clean Power).`);
  }

  // Fulfill Contract
  else if (action === 'action:fulfill_contract') {
    const c = state.currentContract;
    state.resources.alloy -= c.targetAlloy;
    state.resources.polymer -= c.targetPolymer;
    state.resources.circuit -= c.targetCircuit;

    state.credits += c.rewardCredits;
    state.contractsCompleted += 1;
    reward += 50 + c.rewardCredits / 10;
    state.score += 100 + c.rewardCredits / 5;

    addLog(state, `FULFILLED CONTRACT #${c.id}: Delivered trade cargo for +$${c.rewardCredits} Credits!`);

    // Next Contract Generation
    const nextTier = state.contractsCompleted + 1;
    const rng = () => getRng(state);
    state.currentContract = generateContract(nextTier, rng);
  }

  // Logistics Cycle (Automated production tick)
  else if (action === 'action:cycle_logistics') {
    state.cycle += 1;
    const power = calculatePower(state);
    const efficiency = power.balance >= 0 ? 1.0 : Math.max(0.3, power.supply / Math.max(1, power.demand));

    // Raw Extraction
    const oreHarvest = Math.floor(state.facilities.miners * 2 * efficiency);
    const gasHarvest = Math.floor(state.facilities.extractors * 2 * efficiency);
    state.resources.ore += oreHarvest;
    state.resources.gas += gasHarvest;

    // Smelting (2 Ore -> 1 Alloy)
    const maxSmelt = Math.floor(state.facilities.smelters * 2 * efficiency);
    const oreAvailableToSmelt = Math.min(state.resources.ore, maxSmelt * 2);
    const alloyProduced = Math.floor(oreAvailableToSmelt / 2);
    state.resources.ore -= alloyProduced * 2;
    state.resources.alloy += alloyProduced;

    // Refining (2 Gas -> 1 Polymer)
    const maxRefine = Math.floor(state.facilities.refineries * 2 * efficiency);
    const gasAvailableToRefine = Math.min(state.resources.gas, maxRefine * 2);
    const polymerProduced = Math.floor(gasAvailableToRefine / 2);
    state.resources.gas -= polymerProduced * 2;
    state.resources.polymer += polymerProduced;

    // Fabricating (1 Alloy + 1 Polymer -> 1 Circuit)
    const maxFab = Math.floor(state.facilities.fabricators * 1 * efficiency);
    const fabPossible = Math.min(state.resources.alloy, state.resources.polymer, maxFab);
    state.resources.alloy -= fabPossible;
    state.resources.polymer -= fabPossible;
    state.resources.circuit += fabPossible;

    // Routine Station Maintenance Fee
    const upkeep = 15 + state.facilities.miners * 2 + state.facilities.extractors * 2 +
                   state.facilities.smelters * 3 + state.facilities.refineries * 3 + state.facilities.fabricators * 5;
    state.credits -= upkeep;

    reward += 4;
    state.score += 8;

    let logMsg = `Cycle ${state.cycle}: Harvested +${oreHarvest} Ore, +${gasHarvest} Gas. Produced +${alloyProduced} Alloy, +${polymerProduced} Polymer, +${fabPossible} Circuits (Upkeep: -$${upkeep}).`;
    if (power.balance < 0) {
      logMsg += ` ⚠️ Energy deficit! Efficiency throttled to ${Math.round(efficiency * 100)}%.`;
    }
    addLog(state, logMsg);
  }

  // Victory Check: Complete 6 contracts and attain >= $4,000 Credits
  if (state.contractsCompleted >= 6 && state.credits >= 4000) {
    state.victory = true;
    state.done = true;
    reward += 200;
    state.score += 300;
    addLog(state, 'FOUNDRY SUPREMACY: Star Foundry has become the apex manufacturing hub of the galaxy!');
    return { reward, done: true };
  }

  // Defeat Checks
  if (state.credits < -400) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'BANKRUPTCY: Station creditors seized foundry assets.');
    return { reward, done: true };
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Galactic trade quarter deadline expired.');
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
    calculatePower,
    canFulfillContract,
    MAX_TURNS
  };
}
