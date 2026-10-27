/**
 * 0149-crafting: Rune & Anvil
 * Pure fantasy crafting and recipe synthesis engine conforming strictly to the Bot Contract.
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
    gold: 350,
    forgeLevel: 1,
    materials: {
      timber: 6,
      ore: 6,
      ingots: 2,
      gems: 1,
      dust: 2
    },
    crafted: {
      shields: 0,
      axes: 0,
      runicBlades: 0,
      crowns: 0
    },
    itemsDelivered: 0,
    score: 0,
    done: false,
    victory: false,
    log: [
      'Rune & Anvil royal armory established in the Citadel district.',
      'Smelt ingots, gather arcane gems, and forge masterwork regalia.'
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

function canSellAny(state) {
  const c = state.crafted;
  return c.shields > 0 || c.axes > 0 || c.runicBlades > 0 || c.crowns > 0;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const m = state.materials;
  const c = state.crafted;

  // Gathering & Extraction
  actions.push('action:gather_materials');
  actions.push('action:quarry_gemstones');

  // Smelting
  if (m.ore >= 2) {
    actions.push('action:smelt_ingot');
  }

  // Tier 1 Craft: Sturdy Shield (3 Timber + 2 Ingots)
  if (m.timber >= 3 && m.ingots >= 2) {
    actions.push('action:craft_shield');
  }

  // Tier 2 Craft: Battleaxe of Might (2 Timber + 4 Ingots)
  if (m.timber >= 2 && m.ingots >= 4) {
    actions.push('action:craft_axe');
  }

  // Tier 3 Craft: Runic Blade (1 Axe + 2 Gems + 2 Dust)
  if (c.axes >= 1 && m.gems >= 2 && m.dust >= 2) {
    actions.push('action:craft_runic_blade');
  }

  // Tier 4 Craft: Sovereign Crown (1 Runic Blade + 1 Shield + 3 Gems + 4 Dust)
  if (c.runicBlades >= 1 && c.shields >= 1 && m.gems >= 3 && m.dust >= 4) {
    actions.push('action:craft_crown');
  }

  // Commercial Guild Delivery
  if (canSellAny(state)) {
    actions.push('action:sell_armaments');
  }

  // Workshop Upgrade
  if (state.gold >= 250 && state.forgeLevel < 4) {
    actions.push('action:upgrade_forge');
  }

  // Advance Day (Always legal)
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

  // Gather Timber & Iron Ore
  if (action === 'action:gather_materials') {
    const rng = getRng(state);
    const timberFound = 3 + Math.floor(rng * 3) + state.forgeLevel;
    const oreFound = 2 + Math.floor(rng * 3);
    state.materials.timber += timberFound;
    state.materials.ore += oreFound;
    reward += 4;
    state.score += 8;
    addLog(state, `Harvested timber and surface iron ore (+${timberFound} Timber, +${oreFound} Ore).`);
  }

  // Quarry Gemstones & Dust
  else if (action === 'action:quarry_gemstones') {
    const rng = getRng(state);
    const gemsFound = 1 + Math.floor(rng * 2);
    const dustFound = 1 + Math.floor(rng * 3);
    state.materials.gems += gemsFound;
    state.materials.dust += dustFound;
    reward += 5;
    state.score += 10;
    addLog(state, `Quarried arcane crystal fissure (+${gemsFound} Gemstone, +${dustFound} Runic Dust).`);
  }

  // Smelt Ingot
  else if (action === 'action:smelt_ingot') {
    state.materials.ore -= 2;
    state.materials.ingots += 1;
    reward += 5;
    state.score += 10;
    addLog(state, 'Smelted purified high-grade Iron Ingot in the blast hearth.');
  }

  // Craft Sturdy Shield
  else if (action === 'action:craft_shield') {
    state.materials.timber -= 3;
    state.materials.ingots -= 2;
    state.crafted.shields += 1;
    reward += 10;
    state.score += 20;
    addLog(state, 'Crafted Sturdy Shield: Banded iron and seasoned oak.');
  }

  // Craft Battleaxe of Might
  else if (action === 'action:craft_axe') {
    state.materials.timber -= 2;
    state.materials.ingots -= 4;
    state.crafted.axes += 1;
    reward += 15;
    state.score += 35;
    addLog(state, 'Forged Battleaxe of Might: Double-bitted razor steel edge.');
  }

  // Craft Runic Blade
  else if (action === 'action:craft_runic_blade') {
    state.crafted.axes -= 1;
    state.materials.gems -= 2;
    state.materials.dust -= 2;
    state.crafted.runicBlades += 1;
    reward += 30;
    state.score += 75;
    addLog(state, 'ENCHANTED RUNIC BLADE: Infused martial steel with glowing arcane glyphs!');
  }

  // Craft Sovereign Crown
  else if (action === 'action:craft_crown') {
    state.crafted.runicBlades -= 1;
    state.crafted.shields -= 1;
    state.materials.gems -= 3;
    state.materials.dust -= 4;
    state.crafted.crowns += 1;
    reward += 80;
    state.score += 200;
    addLog(state, 'LEGENDARY SYNTHESIS: Forged the Crown of the High Sovereign!');
  }

  // Sell Armaments to Knights
  else if (action === 'action:sell_armaments') {
    let earned = 0;
    let soldCount = 0;

    if (state.crafted.crowns > 0) {
      earned += state.crafted.crowns * 950;
      soldCount += state.crafted.crowns;
      state.crafted.crowns = 0;
    }
    if (state.crafted.runicBlades > 0) {
      earned += state.crafted.runicBlades * 380;
      soldCount += state.crafted.runicBlades;
      state.crafted.runicBlades = 0;
    }
    if (state.crafted.axes > 0) {
      earned += state.crafted.axes * 160;
      soldCount += state.crafted.axes;
      state.crafted.axes = 0;
    }
    if (state.crafted.shields > 0) {
      earned += state.crafted.shields * 90;
      soldCount += state.crafted.shields;
      state.crafted.shields = 0;
    }

    state.gold += earned;
    state.itemsDelivered += soldCount;
    reward += 20 + Math.floor(earned / 30);
    state.score += 40 + Math.floor(earned / 15);
    addLog(state, `Delivered ${soldCount} masterwork armaments to the Royal Garrison for +$${earned} Gold!`);
  }

  // Upgrade Forge
  else if (action === 'action:upgrade_forge') {
    state.gold -= 250;
    state.forgeLevel += 1;
    reward += 15;
    state.score += 30;
    addLog(state, `Upgraded workshop anvil and hearth: Master Artificer Level ${state.forgeLevel}!`);
  }

  // Advance Day
  else if (action === 'action:advance_day') {
    state.day += 1;

    // Daily Forge Lease & Coal Fuel
    const lease = 30 + state.forgeLevel * 10;
    state.gold -= lease;

    reward += 4;
    state.score += 8;
    addLog(state, `Day ${state.day} begins: Paid $${lease} guild workshop fuel and lease.`);
  }

  // Victory Check: At least 1 Crown crafted and gold >= $3,000
  if ((state.crafted.crowns >= 1 || state.itemsDelivered >= 8) && state.gold >= 3000) {
    state.victory = true;
    state.done = true;
    reward += 200;
    state.score += 300;
    addLog(state, 'CRAFTING SUPREMACY: Rune & Anvil has become the legendary armory of the kingdom!');
    return { reward, done: true };
  }

  // Defeat Checks
  if (state.gold < -300) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'INSOLVENCY: Unpaid guild forge debts foreclosed the workshop.');
    return { reward, done: true };
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Royal tournament commissioning timeframe expired.');
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
