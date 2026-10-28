// 0168-incremental: Quantum Forge Incremental - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

const FACILITY_TYPES = ['synthesizer', 'splitter', 'accelerator', 'quantumComputer', 'singularityEngine'];

const FACILITY_BASE_COSTS = {
  synthesizer: { matter: 15, energy: 0 },
  splitter: { matter: 80, energy: 0 },
  accelerator: { matter: 350, energy: 15 },
  quantumComputer: { matter: 1500, energy: 60 },
  singularityEngine: { matter: 6000, energy: 250 }
};

const FACILITY_BASE_YIELDS = {
  synthesizer: { matter: 2, energy: 0 },
  splitter: { matter: 10, energy: 1 },
  accelerator: { matter: 40, energy: 5 },
  quantumComputer: { matter: 150, energy: 20 },
  singularityEngine: { matter: 800, energy: 100 }
};

function getFacilityCost(type, count) {
  const base = FACILITY_BASE_COSTS[type];
  const mult = Math.pow(1.15, count);
  return {
    matter: Math.floor(base.matter * mult),
    energy: Math.floor(base.energy * mult)
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
    maxTurns: 800,
    matter: 20,
    energy: 0,
    cubits: 0,
    facilities: {
      synthesizer: 0,
      splitter: 0,
      accelerator: 0,
      quantumComputer: 0,
      singularityEngine: 0
    },
    researches: {
      matterCompression: false,
      superconductivity: false,
      quantumResonance: false
    },
    inversionsPerformed: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Quantum Forge initialized. Harvest subatomic matter and construct particle facilities.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = Math.floor(state.matter / 100);
  val += Math.floor(state.energy * 5);
  val += state.cubits * 1500;
  val += state.facilities.synthesizer * 25;
  val += state.facilities.splitter * 100;
  val += state.facilities.accelerator * 400;
  val += state.facilities.quantumComputer * 1500;
  val += state.facilities.singularityEngine * 6000;
  if (state.researches.matterCompression) val += 200;
  if (state.researches.superconductivity) val += 500;
  if (state.researches.quantumResonance) val += 1000;
  if (state.victory) val += 10000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Manual matter synthesis is always available
  actions.push('action:synthesize_matter');

  // Automated idle harvest tick
  actions.push('action:idle_cycle');

  // Purchase facility upgrades
  for (const type of FACILITY_TYPES) {
    const cost = getFacilityCost(type, state.facilities[type]);
    if (state.matter >= cost.matter && state.energy >= cost.energy) {
      actions.push('action:purchase_facility:' + type);
    }
  }

  // Researches
  if (!state.researches.matterCompression && state.matter >= 150) {
    actions.push('action:research_matter_compression');
  }
  if (!state.researches.superconductivity && state.matter >= 600 && state.energy >= 40) {
    actions.push('action:research_superconductivity');
  }
  if (!state.researches.quantumResonance && state.matter >= 2500 && state.energy >= 150) {
    actions.push('action:research_quantum_resonance');
  }

  // Quantum Inversion Prestige
  if (state.energy >= 120) {
    actions.push('action:quantum_inversion_prestige');
  }

  // Victory Condition
  if (state.facilities.singularityEngine >= 1 && state.cubits >= 2 && state.matter >= 40000) {
    actions.push('action:trigger_universal_genesis');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal incremental action "' + action + '" in current state');
  }

  const oldScore = score(state);

  const cubitBonus = state.researches.quantumResonance ? 1.5 : 1.0;
  const cubitMult = 1 + state.cubits * cubitBonus;
  const superMult = state.researches.superconductivity ? 1.5 : 1.0;

  if (action === 'action:synthesize_matter') {
    const clickBase = state.researches.matterCompression ? 12 : 6;
    const gain = Math.floor(clickBase * cubitMult);
    state.matter += gain;
    state.gameMessage = 'Extracted raw subatomic matter from quantum foam: +' + gain + ' Matter.';
  } else if (action === 'action:idle_cycle') {
    state.gameMessage = 'Quantum manifold resonating. Harvesting subatomic flux.';
  } else if (action.startsWith('action:purchase_facility:')) {
    const type = action.split(':')[2];
    const cost = getFacilityCost(type, state.facilities[type]);
    state.matter -= cost.matter;
    state.energy -= cost.energy;
    state.facilities[type] += 1;
    state.gameMessage = 'Constructed ' + type + ' (Total: ' + state.facilities[type] + ').';
  } else if (action === 'action:research_matter_compression') {
    state.matter -= 150;
    state.researches.matterCompression = true;
    state.gameMessage = 'Researched Matter Compression: manual extraction power permanently doubled.';
  } else if (action === 'action:research_superconductivity') {
    state.matter -= 600;
    state.energy -= 40;
    state.researches.superconductivity = true;
    state.gameMessage = 'Researched Superconductivity: global energy and matter output increased +50%.';
  } else if (action === 'action:research_quantum_resonance') {
    state.matter -= 2500;
    state.energy -= 150;
    state.researches.quantumResonance = true;
    state.gameMessage = 'Researched Quantum Resonance: Entangled Cubit multipliers upgraded to +150% each.';
  } else if (action === 'action:quantum_inversion_prestige') {
    state.inversionsPerformed += 1;
    state.cubits += 1;
    state.matter = 50;
    state.energy = 0;
    state.facilities.synthesizer = 0;
    state.facilities.splitter = 0;
    state.facilities.accelerator = 0;
    state.facilities.quantumComputer = 0;
    state.facilities.singularityEngine = 0;
    state.gameMessage = 'QUANTUM INVERSION! Inverted state manifold and secured +1 Entangled Cubit.';
  } else if (action === 'action:trigger_universal_genesis') {
    state.victory = true;
    state.gameMessage = 'VICTORY! Singularity Engine reached critical resonance! Universal Genesis complete!';
  }

  // Automated Incremental Generation Tick
  let idleMatter = 0;
  let idleEnergy = 0;

  for (const type of FACILITY_TYPES) {
    const count = state.facilities[type];
    if (count > 0) {
      idleMatter += count * FACILITY_BASE_YIELDS[type].matter;
      idleEnergy += count * FACILITY_BASE_YIELDS[type].energy;
    }
  }

  const finalMatterGain = Math.floor(idleMatter * cubitMult * superMult);
  const finalEnergyGain = Math.floor(idleEnergy * cubitMult * superMult);

  state.matter += finalMatterGain;
  state.energy += finalEnergyGain;

  state.turns += 1;

  if (state.turns >= state.maxTurns && !state.victory) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Quantum stability collapsed before completing Universal Genesis.';
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
    FACILITY_TYPES,
    FACILITY_BASE_COSTS,
    FACILITY_BASE_YIELDS,
    getFacilityCost
  };
}
