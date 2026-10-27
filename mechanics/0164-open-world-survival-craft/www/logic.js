// 0164-open-world-survival-craft: Wilderness Craft - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const BIOME_NAMES = [
  'Coastal Beach',
  'Pine Forest',
  'Granite Mountain Ridge',
  'Ancient Ruins'
];

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    biome: 0,
    health: 100,
    hunger: 90,
    thirst: 90,
    stamina: 100,
    // Resources
    wood: 10,
    stone: 6,
    fiber: 8,
    flint: 4,
    ironOre: 0,
    ironIngots: 0,
    rawMeat: 1,
    cookedRations: 2,
    purifiedWater: 2,
    // Crafting & Upgrades
    hasCampfire: false,
    hasWorkbench: false,
    hasShelter: false,
    hasSmelter: false,
    hasIronTools: false,
    hasSignalBeacon: false,
    structuresBuilt: 0,
    beastsHunted: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Washed ashore on Coastal Beach. Gather supplies and build shelter before dark.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.structuresBuilt * 300;
  val += state.beastsHunted * 150;
  val += state.biome * 200;
  val += Math.floor(state.health * 4);
  val += Math.floor(state.hunger * 2);
  val += Math.floor(state.thirst * 2);
  val += state.ironIngots * 80;
  val += state.cookedRations * 25;
  val += state.purifiedWater * 25;
  if (state.hasIronTools) val += 500;
  if (state.hasSignalBeacon) val += 1000;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Scavenging ground items (always legal, costs 0 stamina)
  actions.push('action:gather_fiber_and_flint');

  // Basic harvesting with stamina
  if (state.stamina >= 15) {
    actions.push('action:chop_trees');
  }
  if (state.stamina >= 20) {
    actions.push('action:mine_rock_and_ore');
    actions.push('action:hunt_wildlife');
  }

  // Hydration & Nutrition
  if (state.purifiedWater >= 1 && (state.thirst < 100 || state.stamina < 100)) {
    actions.push('action:drink_water');
  }
  if (state.cookedRations >= 1 && (state.hunger < 100 || state.health < 100)) {
    actions.push('action:eat_cooked_ration');
  }

  // Cooking & Purifying at Campfire
  if (state.hasCampfire) {
    if (state.rawMeat >= 1 && state.wood >= 1) {
      actions.push('action:cook_rations');
    }
    if (state.wood >= 1) {
      actions.push('action:purify_water');
    }
  }

  // Smelting
  if (state.hasSmelter && state.ironOre >= 2 && state.wood >= 2) {
    actions.push('action:smelt_iron');
  }

  // Upgrades
  if (state.hasWorkbench && !state.hasIronTools && state.ironIngots >= 4 && state.wood >= 6) {
    actions.push('action:upgrade_tools_to_iron');
  }

  // Structures Crafting
  if (!state.hasCampfire && state.wood >= 4 && state.stone >= 3) {
    actions.push('action:craft_campfire');
  }
  if (!state.hasWorkbench && state.wood >= 8 && state.flint >= 2) {
    actions.push('action:craft_workbench');
  }
  if (state.hasWorkbench && !state.hasShelter && state.wood >= 15 && state.fiber >= 8) {
    actions.push('action:craft_shelter');
  }
  if (state.hasWorkbench && !state.hasSmelter && state.stone >= 14 && state.wood >= 10) {
    actions.push('action:craft_smelter');
  }
  if (state.hasWorkbench && state.biome === 3 && !state.hasSignalBeacon && state.ironIngots >= 5 && state.wood >= 12 && state.fiber >= 6) {
    actions.push('action:craft_signal_beacon');
  }

  // Resting
  actions.push('action:rest_at_shelter');

  // Biome travel
  for (let b = 0; b < BIOME_NAMES.length; b++) {
    if (b !== state.biome && state.stamina >= 20) {
      actions.push('action:travel_to_biome:' + b);
    }
  }

  // Victory Escape
  if (state.hasSignalBeacon && state.biome === 3) {
    actions.push('action:escape_wilderness');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal survival craft action "' + action + '" in current state');
  }

  const oldScore = score(state);

  if (action === 'action:gather_fiber_and_flint') {
    const fiberGain = 2 + Math.floor(nextRand(state) * 3);
    const flintGain = 1 + Math.floor(nextRand(state) * 2);
    state.fiber += fiberGain;
    state.flint += flintGain;
    state.gameMessage = 'Scavenged shoreline: gathered +' + fiberGain + ' Plant Fiber and +' + flintGain + ' Flint.';
  } else if (action === 'action:chop_trees') {
    state.stamina -= 15;
    const woodMult = state.hasIronTools ? 2 : 1;
    const woodGain = (4 + Math.floor(nextRand(state) * 4)) * woodMult;
    state.wood += woodGain;
    state.gameMessage = 'Felled timber grove: +' + woodGain + ' Wood.';
  } else if (action === 'action:mine_rock_and_ore') {
    state.stamina -= 20;
    const stoneGain = 4 + Math.floor(nextRand(state) * 3);
    state.stone += stoneGain;

    let oreGain = 0;
    if (state.biome >= 2) {
      oreGain = 1 + Math.floor(nextRand(state) * (state.hasIronTools ? 3 : 2));
      state.ironOre += oreGain;
    }
    state.gameMessage = 'Quarried rocky crag: +' + stoneGain + ' Stone' + (oreGain > 0 ? ', +' + oreGain + ' Iron Ore!' : '.');
  } else if (action === 'action:hunt_wildlife') {
    state.stamina -= 20;
    const hitRoll = nextRand(state);
    if (hitRoll < 0.75) {
      const meatGain = 1 + Math.floor(nextRand(state) * 2);
      state.rawMeat += meatGain;
      state.beastsHunted += 1;
      state.gameMessage = 'Tracked and struck wild game! +' + meatGain + ' Raw Meat.';
    } else {
      const dmg = 12 + Math.floor(nextRand(state) * 8);
      state.health = Math.max(0, state.health - dmg);
      state.gameMessage = 'Predator ambushed during hunt! Took -' + dmg + ' damage!';
    }
  } else if (action === 'action:drink_water') {
    state.purifiedWater -= 1;
    state.thirst = Math.min(100, state.thirst + 45);
    state.stamina = Math.min(100, state.stamina + 20);
    state.gameMessage = 'Quenched thirst with fresh purified water (+45 Thirst, +20 Stamina).';
  } else if (action === 'action:eat_cooked_ration') {
    state.cookedRations -= 1;
    state.hunger = Math.min(100, state.hunger + 45);
    state.health = Math.min(100, state.health + 20);
    state.gameMessage = 'Consumed warm cooked ration (+45 Hunger, +20 Health).';
  } else if (action === 'action:cook_rations') {
    state.rawMeat -= 1;
    state.wood -= 1;
    state.cookedRations += 1;
    state.gameMessage = 'Roast savory meat skewers over campfire (+1 Cooked Ration).';
  } else if (action === 'action:purify_water') {
    state.wood -= 1;
    state.purifiedWater += 2;
    state.gameMessage = 'Boiled seawater in stone pot (+2 Purified Water).';
  } else if (action === 'action:craft_campfire') {
    state.wood -= 4;
    state.stone -= 3;
    state.hasCampfire = true;
    state.structuresBuilt += 1;
    state.gameMessage = 'Constructed Campfire! Warmth and cooking unlocked.';
  } else if (action === 'action:craft_workbench') {
    state.wood -= 8;
    state.flint -= 2;
    state.hasWorkbench = true;
    state.structuresBuilt += 1;
    state.gameMessage = 'Assembled Artisan Workbench! Advanced recipes unlocked.';
  } else if (action === 'action:craft_shelter') {
    state.wood -= 15;
    state.fiber -= 8;
    state.hasShelter = true;
    state.structuresBuilt += 1;
    state.gameMessage = 'Built Timber Shelter! Full rest and predator protection unlocked.';
  } else if (action === 'action:craft_smelter') {
    state.stone -= 14;
    state.wood -= 10;
    state.hasSmelter = true;
    state.structuresBuilt += 1;
    state.gameMessage = 'Erected Blast Smelter! Iron metallurgy unlocked.';
  } else if (action === 'action:smelt_iron') {
    state.ironOre -= 2;
    state.wood -= 2;
    state.ironIngots += 1;
    state.gameMessage = 'Smelted iron ore into refined Iron Ingot (+1 Ingot).';
  } else if (action === 'action:upgrade_tools_to_iron') {
    state.ironIngots -= 4;
    state.wood -= 6;
    state.hasIronTools = true;
    state.gameMessage = 'Forged Heavy Iron Axe & Pickaxe! Harvest yields doubled.';
  } else if (action === 'action:craft_signal_beacon') {
    state.ironIngots -= 5;
    state.wood -= 12;
    state.fiber -= 6;
    state.hasSignalBeacon = true;
    state.structuresBuilt += 1;
    state.gameMessage = 'Constructed High-Frequency Emergency Signal Beacon atop the Ancient Ruins!';
  } else if (action === 'action:rest_at_shelter') {
    const staminaGain = state.hasShelter ? 60 : 30;
    const healthGain = state.hasShelter ? 15 : 5;
    state.stamina = Math.min(100, state.stamina + staminaGain);
    state.health = Math.min(100, state.health + healthGain);
    state.gameMessage = state.hasShelter
      ? 'Slept comfortably in fortified shelter (+60 Stamina, +15 Health).'
      : 'Rested fitfully beneath open skies (+30 Stamina, +5 Health).';
  } else if (action.startsWith('action:travel_to_biome:')) {
    const target = parseInt(action.split(':')[2], 10);
    state.stamina -= 20;
    state.biome = target;
    state.gameMessage = 'Traversed wild terrain into ' + BIOME_NAMES[target] + '.';
  } else if (action === 'action:escape_wilderness') {
    state.victory = true;
    state.gameMessage = 'Victory! Signal beacon activated! Coast guard rescue vessel secures extraction!';
  }

  // Turn metabolism & atmospheric decay
  state.turns += 1;
  state.hunger = Math.max(0, state.hunger - 4);
  state.thirst = Math.max(0, state.thirst - 5);

  // Starvation & Dehydration penalties
  if (state.hunger <= 0) {
    state.health = Math.max(0, state.health - 8);
    state.gameMessage += ' (Starving! -8 Health.)';
  }
  if (state.thirst <= 0) {
    state.health = Math.max(0, state.health - 10);
    state.gameMessage += ' (Dehydrated! -10 Health.)';
  }

  // Night hazard if no shelter
  if (!state.hasShelter && state.turns % 5 === 0) {
    if (nextRand(state) < 0.4) {
      state.health = Math.max(0, state.health - 12);
      state.gameMessage += ' (Night wolves stalked the open wilderness! -12 Health.)';
    }
  }

  // Defeat checks
  if (state.health <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Perished in the untamed wilderness.';
  } else if (state.turns >= state.maxTurns) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Monsoons engulfed the archipelago before rescue could arrive.';
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
    BIOME_NAMES
  };
}
