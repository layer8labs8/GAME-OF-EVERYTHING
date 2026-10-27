/**
 * 0150-automation: Conveyor Core
 * Pure factory automation and logistics simulation engine conforming strictly to the Bot Contract.
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

function createState(seed = 1) {
  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    cycle: 1,
    credits: 400,
    beltLevel: 1,
    machines: {
      miners: 1,
      smelters: 1,
      assemblers: 1,
      generators: 2
    },
    items: {
      copper: 8,
      silicon: 8,
      wire: 2,
      wafers: 2,
      gates: 0,
      processors: 0
    },
    processorsExported: 0,
    score: 0,
    done: false,
    victory: false,
    log: [
      'Conveyor Core automated industrial sector initialized.',
      'Deploy autonomous miners, smelters, and assemblers to produce quantum processors.'
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
  const supply = state.machines.generators * 5;
  const demand = state.machines.miners * 1 +
                 state.machines.smelters * 2 +
                 state.machines.assemblers * 3;
  return { supply, demand, balance: supply - demand };
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const creds = state.credits;
  const m = state.machines;

  // Machinery Installation
  if (creds >= 80 && m.miners < 6) {
    actions.push('action:build_miner');
  }
  if (creds >= 120 && m.smelters < 6) {
    actions.push('action:build_smelter');
  }
  if (creds >= 180 && m.assemblers < 5) {
    actions.push('action:build_assembler');
  }
  if (creds >= 100 && m.generators < 6) {
    actions.push('action:build_generator');
  }

  // Conveyor Belt Logistics Upgrade
  if (creds >= 150 && state.beltLevel < 3) {
    actions.push('action:upgrade_conveyors');
  }

  // Market Export
  if (state.items.gates > 0 || state.items.processors > 0) {
    actions.push('action:export_goods');
  }

  // Automated Factory Tick (Always legal)
  actions.push('action:cycle_factory');

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

  // Build Miner
  if (action === 'action:build_miner') {
    state.credits -= 80;
    state.machines.miners += 1;
    reward += 5;
    state.score += 10;
    addLog(state, `Installed automated mineral drill (Active Drills: ${state.machines.miners}).`);
  }

  // Build Smelter
  else if (action === 'action:build_smelter') {
    state.credits -= 120;
    state.machines.smelters += 1;
    reward += 8;
    state.score += 15;
    addLog(state, `Constructed induction smelter (Active Smelters: ${state.machines.smelters}).`);
  }

  // Build Assembler
  else if (action === 'action:build_assembler') {
    state.credits -= 180;
    state.machines.assemblers += 1;
    reward += 12;
    state.score += 25;
    addLog(state, `Deployed robotic component assembler (Active Assemblers: ${state.machines.assemblers}).`);
  }

  // Build Generator
  else if (action === 'action:build_generator') {
    state.credits -= 100;
    state.machines.generators += 1;
    reward += 6;
    state.score += 12;
    addLog(state, `Added generator unit: +5 kW power supply.`);
  }

  // Upgrade Conveyors
  else if (action === 'action:upgrade_conveyors') {
    state.credits -= 150;
    state.beltLevel += 1;
    reward += 15;
    state.score += 30;
    addLog(state, `Upgraded conveyor belt logistics to Mark-${state.beltLevel} (Throughput accelerated)!`);
  }

  // Export Goods
  else if (action === 'action:export_goods') {
    const procSold = state.items.processors;
    const gatesSold = state.items.gates;
    const earned = procSold * 220 + gatesSold * 60;

    state.credits += earned;
    state.processorsExported += procSold;
    state.items.processors = 0;
    state.items.gates = 0;

    reward += 20 + Math.floor(earned / 20);
    state.score += 40 + Math.floor(earned / 10);
    addLog(state, `EXPORT COMPLETE: Shipped ${procSold} Processors and ${gatesSold} Logic Gates for +$${earned} Credits!`);
  }

  // Automated Factory Cycle
  else if (action === 'action:cycle_factory') {
    state.cycle += 1;

    const power = calculatePower(state);
    const efficiency = power.balance >= 0 ? 1.0 : Math.max(0.3, power.supply / Math.max(1, power.demand));
    const speed = state.beltLevel === 1 ? 1 : (state.beltLevel === 2 ? 1.5 : 2.0);

    // 1. Raw Extraction
    const copperMined = Math.floor(state.machines.miners * 2 * efficiency * speed);
    const siliconMined = Math.floor(state.machines.miners * 2 * efficiency * speed);
    state.items.copper += copperMined;
    state.items.silicon += siliconMined;

    // 2. Smelting: Copper -> Wire, Silicon -> Wafers
    const maxSmelt = Math.floor(state.machines.smelters * 2 * efficiency * speed);
    const copperToSmelt = Math.min(state.items.copper, maxSmelt);
    state.items.copper -= copperToSmelt;
    state.items.wire += copperToSmelt;

    const siliconToSmelt = Math.min(state.items.silicon, maxSmelt);
    state.items.silicon -= siliconToSmelt;
    state.items.wafers += siliconToSmelt;

    // 3. Assembly Tier 1: Logic Gates (2 Wire + 1 Wafer -> 1 Logic Gate)
    const maxGates = Math.floor(state.machines.assemblers * 2 * efficiency);
    const possibleGates = Math.min(Math.floor(state.items.wire / 2), state.items.wafers, maxGates);
    state.items.wire -= possibleGates * 2;
    state.items.wafers -= possibleGates;
    state.items.gates += possibleGates;

    // 4. Assembly Tier 2: Quantum Processors (2 Gates + 2 Wafers -> 1 Processor)
    const maxProc = Math.floor(state.machines.assemblers * 1 * efficiency);
    const possibleProc = Math.min(Math.floor(state.items.gates / 2), Math.floor(state.items.wafers / 2), maxProc);
    state.items.gates -= possibleProc * 2;
    state.items.wafers -= possibleProc * 2;
    state.items.processors += possibleProc;

    // Factory Operating Upkeep
    const upkeep = 10 + state.machines.miners * 2 + state.machines.smelters * 3 + state.machines.assemblers * 4;
    state.credits -= upkeep;

    reward += 4;
    state.score += 8;

    let logMsg = `Cycle ${state.cycle}: Conveyors routed +${copperMined} Cu, +${siliconMined} Si. Produced +${copperToSmelt} Wire, +${siliconToSmelt} Wafers, +${possibleGates} Gates, +${possibleProc} Processors (Upkeep: -$${upkeep}).`;
    if (power.balance < 0) {
      logMsg += ` ⚠️ Power deficit (${power.supply}/${power.demand} kW)! Speed throttled.`;
    }
    addLog(state, logMsg);
  }

  // Victory Check: Export 15 Processors, Mark-3 Belts, and Credits >= 3500
  if (state.processorsExported >= 15 && state.beltLevel >= 3 && state.credits >= 3500) {
    state.victory = true;
    state.done = true;
    reward += 200;
    state.score += 300;
    addLog(state, 'AUTOMATION SUPREMACY: Conveyor Core has attained flawless autonomous industrial scale!');
    return { reward, done: true };
  }

  // Defeat Checks
  if (state.credits < -300) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'INSOLVENCY: Factory power cut and operations liquidated.');
    return { reward, done: true };
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Industrial production quarter deadline concluded.');
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
    MAX_TURNS
  };
}
