/**
 * 0144-colony-sim: Aegis Outpost
 * Pure colony survival simulation engine conforming strictly to the Bot Contract.
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

function createState(seed = 1) {
  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    day: 1,
    colonists: 4,
    maxCapacity: 6,
    health: 90,
    morale: 80,
    resources: {
      rations: 20,
      water: 20,
      oxygen: 25,
      energy: 15,
      scrap: 60,
      components: 30
    },
    facilities: {
      biodomes: 1,
      scrubbers: 1,
      condensers: 1,
      reactors: 1,
      quarters: 1
    },
    event: 'Calm Sol',
    score: 0,
    done: false,
    victory: false,
    log: [
      'Aegis Outpost established on the lunar plains of Kepler-442b.',
      'Maintain life support (Oxygen, Water, Rations) and build shelters to expand the colony.'
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

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const res = state.resources;

  // Infrastructure construction
  if (res.scrap >= 30 && res.components >= 15 && state.facilities.biodomes < 5) {
    actions.push('action:build_biodome');
  }
  if (res.scrap >= 25 && res.components >= 10 && state.facilities.scrubbers < 5) {
    actions.push('action:build_scrubber');
  }
  if (res.scrap >= 25 && res.components >= 10 && state.facilities.condensers < 5) {
    actions.push('action:build_condenser');
  }
  if (res.scrap >= 40 && res.components >= 20 && state.facilities.reactors < 4) {
    actions.push('action:build_reactor');
  }
  if (res.scrap >= 35 && res.components >= 10 && state.facilities.quarters < 6) {
    actions.push('action:build_quarters');
  }

  // Operations
  actions.push('action:scavenge_surface');

  if (res.scrap >= 10 && res.components >= 5 && (state.health < 95 || state.morale < 95)) {
    actions.push('action:treat_colonists');
  }

  // Sol advance (Always legal)
  actions.push('action:advance_day');

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

  // Build Biodome
  if (action === 'action:build_biodome') {
    state.resources.scrap -= 30;
    state.resources.components -= 15;
    state.facilities.biodomes += 1;
    reward += 8;
    state.score += 15;
    addLog(state, `Constructed Hydroponics Biodome (Active Domes: ${state.facilities.biodomes}).`);
  }

  // Build Scrubber
  else if (action === 'action:build_scrubber') {
    state.resources.scrap -= 25;
    state.resources.components -= 10;
    state.facilities.scrubbers += 1;
    reward += 8;
    state.score += 15;
    addLog(state, `Constructed Atmospheric O2 Scrubber (Active Scrubbers: ${state.facilities.scrubbers}).`);
  }

  // Build Condenser
  else if (action === 'action:build_condenser') {
    state.resources.scrap -= 25;
    state.resources.components -= 10;
    state.facilities.condensers += 1;
    reward += 8;
    state.score += 15;
    addLog(state, `Constructed Moisture Condenser (Active Condensers: ${state.facilities.condensers}).`);
  }

  // Build Geothermal Reactor
  else if (action === 'action:build_reactor') {
    state.resources.scrap -= 40;
    state.resources.components -= 20;
    state.facilities.reactors += 1;
    reward += 10;
    state.score += 20;
    addLog(state, `Erected Geothermal Power Reactor (Active Reactors: ${state.facilities.reactors}).`);
  }

  // Build Habitat Quarters
  else if (action === 'action:build_quarters') {
    state.resources.scrap -= 35;
    state.resources.components -= 10;
    state.facilities.quarters += 1;
    state.maxCapacity += 2;
    reward += 10;
    state.score += 20;
    addLog(state, `Expanded Habitat Quarters (Outpost Capacity: ${state.maxCapacity} Colonists).`);
  }

  // Scavenge Surface Expedition
  else if (action === 'action:scavenge_surface') {
    const rng = getRng(state);
    const scrapFound = 15 + Math.floor(rng * 15);
    const compFound = 6 + Math.floor(rng * 8);
    state.resources.scrap += scrapFound;
    state.resources.components += compFound;

    // Minor fatigue
    state.morale = Math.max(10, state.morale - 2);
    reward += 5;
    state.score += 10;
    addLog(state, `Rover expedition returned with +${scrapFound} Scrap and +${compFound} Components.`);
  }

  // Treat Colonists
  else if (action === 'action:treat_colonists') {
    state.resources.scrap -= 10;
    state.resources.components -= 5;
    state.health = Math.min(100, state.health + 20);
    state.morale = Math.min(100, state.morale + 15);
    reward += 6;
    state.score += 12;
    addLog(state, `Medical triage administered (+20% Health, +15% Morale).`);
  }

  // Advance Day / Sol
  else if (action === 'action:advance_day') {
    state.day += 1;

    // Facility production
    const rationsHarvest = state.facilities.biodomes * 4;
    const waterHarvest = state.facilities.condensers * 4;
    const oxygenHarvest = state.facilities.scrubbers * 4;
    const energyHarvest = state.facilities.reactors * 6;

    state.resources.rations += rationsHarvest;
    state.resources.water += waterHarvest;
    state.resources.oxygen += oxygenHarvest;
    state.resources.energy += energyHarvest;

    // Consumption by population
    const needRations = state.colonists;
    const needWater = state.colonists;
    const needOxygen = state.colonists;
    const needEnergy = state.colonists * 2;

    let deficitOccurred = false;

    // Rations
    if (state.resources.rations >= needRations) {
      state.resources.rations -= needRations;
    } else {
      deficitOccurred = true;
      const deficit = needRations - state.resources.rations;
      state.resources.rations = 0;
      state.health = Math.max(0, state.health - deficit * 4);
      state.morale = Math.max(0, state.morale - deficit * 5);
      addLog(state, `⚠️ Food shortage! Colonists starved (-${deficit * 4}% Health).`);
    }

    // Water
    if (state.resources.water >= needWater) {
      state.resources.water -= needWater;
    } else {
      deficitOccurred = true;
      const deficit = needWater - state.resources.water;
      state.resources.water = 0;
      state.health = Math.max(0, state.health - deficit * 5);
      state.morale = Math.max(0, state.morale - deficit * 6);
      addLog(state, `⚠️ Water shortage! Dehydration crisis (-${deficit * 5}% Health).`);
    }

    // Oxygen
    if (state.resources.oxygen >= needOxygen) {
      state.resources.oxygen -= needOxygen;
    } else {
      deficitOccurred = true;
      const deficit = needOxygen - state.resources.oxygen;
      state.resources.oxygen = 0;
      state.health = Math.max(0, state.health - deficit * 8);
      state.morale = Math.max(0, state.morale - deficit * 6);
      addLog(state, `⚠️ Atmospheric scrubber failure! Hypoxia hazard (-${deficit * 8}% Health).`);
    }

    // Energy
    if (state.resources.energy >= needEnergy) {
      state.resources.energy -= needEnergy;
    } else {
      state.resources.energy = 0;
      state.morale = Math.max(0, state.morale - 4);
    }

    // Environmental Event
    const eventRng = getRng(state);
    if (eventRng < 0.20) {
      state.event = 'Cold Snap';
      state.health = Math.max(0, state.health - 5);
      state.resources.energy = Math.max(0, state.resources.energy - 4);
      addLog(state, 'Sub-zero Cold Snap struck the sector: Thermal heaters strained.');
    } else if (eventRng < 0.35) {
      state.event = 'Dust Storm';
      state.resources.oxygen = Math.max(0, state.resources.oxygen - 3);
      addLog(state, 'Lunar Dust Storm clogged atmospheric intake filters.');
    } else {
      state.event = 'Calm Sol';
    }

    // Colonist Immigrant Shuttle Arrival
    if (!deficitOccurred && state.morale >= 70 && state.health >= 70 && state.colonists < state.maxCapacity) {
      state.colonists += 1;
      reward += 15;
      state.score += 25;
      addLog(state, `🚀 Colony Transport Shuttle arrived! Welcome pioneer colonist #${state.colonists}.`);
    }

    reward += 5;
    state.score += 10;
  }

  // Victory Condition: 12+ Colonists with >= 80% Morale through Day 25
  if (state.colonists >= 12 && state.morale >= 80 && state.day >= 25) {
    state.victory = true;
    state.done = true;
    reward += 200;
    state.score += 300;
    addLog(state, 'COLONY AUTONOMY ACHIEVED: Aegis Outpost has become a thriving self-sufficient lunar civilization!');
    return { reward, done: true };
  }

  // Defeat Conditions
  if (state.colonists <= 0 || state.health <= 0 || state.morale <= 0) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'COLONY LOST: Hostile environmental conditions overwhelmed the outpost.');
    return { reward, done: true };
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Expedition mission timeframe elapsed.');
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
    MAX_TURNS
  };
}
