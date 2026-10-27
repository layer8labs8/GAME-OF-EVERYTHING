/**
 * 0151-inventory-management: Grid Hauler
 * Pure spatial backpack and inventory simulation engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 120;

const ITEM_DEFS = {
  potion: { name: 'Health Potion', w: 1, h: 1, weight: 1, atk: 0, def: 0, hp: 15, cost: 30 },
  dagger: { name: 'Runic Dagger', w: 1, h: 2, weight: 2, atk: 12, def: 0, hp: 0, cost: 60 },
  shield: { name: 'Iron Kite Shield', w: 2, h: 2, weight: 4, atk: 0, def: 18, hp: 0, cost: 100 },
  mana: { name: 'Mana Shard', w: 1, h: 1, weight: 1, atk: 6, def: 2, hp: 0, cost: 50 },
  rations: { name: 'Trail Rations', w: 1, h: 1, weight: 1, atk: 2, def: 2, hp: 10, cost: 25 }
};

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
    chamber: 1,
    gold: 300,
    adventurerHp: 100,
    gridRows: 4,
    gridCols: 4,
    maxWeight: 18,
    items: [
      { id: 'item_1', type: 'dagger', row: 0, col: 0, w: 1, h: 2, weight: 2, atk: 12, def: 0 },
      { id: 'item_2', type: 'shield', row: 0, col: 1, w: 2, h: 2, weight: 4, atk: 0, def: 18 },
      { id: 'item_3', type: 'rations', row: 2, col: 0, w: 1, h: 1, weight: 1, atk: 2, def: 2 }
    ],
    nextItemId: 4,
    chambersCleared: 0,
    score: 0,
    done: false,
    victory: false,
    log: [
      'Expedition Quartermaster packed initial loadout into 4x4 pack.',
      'Organize spatial grid, balance carry weight, and outfit explorer for chamber delves.'
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

function isOccupied(state, r, c) {
  for (let i = 0; i < state.items.length; i++) {
    const it = state.items[i];
    if (r >= it.row && r < it.row + it.h && c >= it.col && c < it.col + it.w) {
      return true;
    }
  }
  return false;
}

function findSlotForItem(state, w, h) {
  for (let r = 0; r <= state.gridRows - h; r++) {
    for (let c = 0; c <= state.gridCols - w; c++) {
      let canPlace = true;
      for (let dr = 0; dr < h; dr++) {
        for (let dc = 0; dc < w; dc++) {
          if (isOccupied(state, r + dr, c + dc)) {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) break;
      }
      if (canPlace) {
        return { r, c };
      }
    }
  }
  return null;
}

function getTotalWeight(state) {
  let total = 0;
  for (let i = 0; i < state.items.length; i++) {
    total += state.items[i].weight;
  }
  return total;
}

function calculateLoadoutPower(state) {
  let totalAtk = 0;
  let totalDef = 0;
  let hasMana = false;

  for (let i = 0; i < state.items.length; i++) {
    const it = state.items[i];
    totalAtk += it.atk || 0;
    totalDef += it.def || 0;
    if (it.type === 'mana') hasMana = true;
  }

  // Synergy bonus: If backpack contains mana shards, weapons receive +6 magic attack
  if (hasMana) {
    totalAtk += 8;
  }

  return { totalAtk, totalDef, power: totalAtk + totalDef };
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const currentWeight = getTotalWeight(state);
  const creds = state.gold;

  // Packing actions
  if (creds >= ITEM_DEFS.potion.cost && currentWeight + ITEM_DEFS.potion.weight <= state.maxWeight && findSlotForItem(state, 1, 1)) {
    actions.push('action:pack_potion');
  }
  if (creds >= ITEM_DEFS.dagger.cost && currentWeight + ITEM_DEFS.dagger.weight <= state.maxWeight && findSlotForItem(state, 1, 2)) {
    actions.push('action:pack_dagger');
  }
  if (creds >= ITEM_DEFS.shield.cost && currentWeight + ITEM_DEFS.shield.weight <= state.maxWeight && findSlotForItem(state, 2, 2)) {
    actions.push('action:pack_shield');
  }
  if (creds >= ITEM_DEFS.mana.cost && currentWeight + ITEM_DEFS.mana.weight <= state.maxWeight && findSlotForItem(state, 1, 1)) {
    actions.push('action:pack_mana');
  }
  if (creds >= ITEM_DEFS.rations.cost && currentWeight + ITEM_DEFS.rations.weight <= state.maxWeight && findSlotForItem(state, 1, 1)) {
    actions.push('action:pack_rations');
  }

  // Backpack Grid Expansion
  if (creds >= 200 && (state.gridRows < 5 || state.gridCols < 5)) {
    actions.push('action:expand_grid');
  }

  // Carry Straps Weight Upgrade
  if (creds >= 150 && state.maxWeight < 32) {
    actions.push('action:upgrade_straps');
  }

  // Dungeon Encounter Delve (Always legal)
  actions.push('action:delve_encounter');

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

  // Pack Item Helper
  function placeItem(typeKey) {
    const def = ITEM_DEFS[typeKey];
    const slot = findSlotForItem(state, def.w, def.h);
    state.gold -= def.cost;
    state.items.push({
      id: 'item_' + (state.nextItemId++),
      type: typeKey,
      row: slot.r,
      col: slot.c,
      w: def.w,
      h: def.h,
      weight: def.weight,
      atk: def.atk,
      def: def.def
    });
    reward += 6;
    state.score += 15;
    addLog(state, `Packed ${def.name} into backpack grid at (${slot.r}, ${slot.c}).`);
  }

  // Pack Potion
  if (action === 'action:pack_potion') {
    placeItem('potion');
  } else if (action === 'action:pack_dagger') {
    placeItem('dagger');
  } else if (action === 'action:pack_shield') {
    placeItem('shield');
  } else if (action === 'action:pack_mana') {
    placeItem('mana');
  } else if (action === 'action:pack_rations') {
    placeItem('rations');
  }

  // Expand Grid
  else if (action === 'action:expand_grid') {
    state.gold -= 200;
    if (state.gridCols < 5) state.gridCols = 5;
    else if (state.gridRows < 5) state.gridRows = 5;
    reward += 15;
    state.score += 30;
    addLog(state, `Tailored backpack expansion: Grid increased to ${state.gridRows}x${state.gridCols}!`);
  }

  // Upgrade Straps
  else if (action === 'action:upgrade_straps') {
    state.gold -= 150;
    state.maxWeight += 4;
    reward += 10;
    state.score += 25;
    addLog(state, `Reinforced harness straps: Max load capacity increased to ${state.maxWeight} kg.`);
  }

  // Delve Chamber Encounter
  else if (action === 'action:delve_encounter') {
    const monsterThreat = 16 + state.chamber * 9;
    const stats = calculateLoadoutPower(state);

    // Consume 1 ration or potion if available for sustain
    let rationIdx = state.items.findIndex(it => it.type === 'rations');
    if (rationIdx !== -1) {
      state.items.splice(rationIdx, 1);
      state.adventurerHp = Math.min(100, state.adventurerHp + 10);
      addLog(state, 'Ate Trail Rations during march (+10 HP).');
    } else {
      state.adventurerHp = Math.max(0, state.adventurerHp - 5);
      addLog(state, 'Hunger penalty: No rations packed (-5 HP).');
    }

    // Resolve Combat encounter
    if (stats.power >= monsterThreat) {
      // Victory in chamber
      const bounty = 100 + state.chamber * 40;
      state.gold += bounty;
      state.chambersCleared += 1;
      state.chamber += 1;
      reward += 25 + state.chamber * 5;
      state.score += 50 + state.chamber * 10;
      addLog(state, `CHAMBER #${state.chamber - 1} CONQUERED! Adventurer defeated threat (${stats.power} vs ${monsterThreat}). Found +$${bounty} Gold!`);
    } else {
      // Defeat / Damage taken
      const damage = monsterThreat - stats.power;
      state.adventurerHp = Math.max(0, state.adventurerHp - damage);
      reward -= 10;
      addLog(state, `Encounter strain! Monster threat (${monsterThreat}) breached defenses (${stats.power}). Suffered -${damage} HP.`);
    }
  }

  // Victory Check: 8 chambers conquered with >= $2,000 Gold
  if (state.chambersCleared >= 8 && state.gold >= 2000) {
    state.victory = true;
    state.done = true;
    reward += 200;
    state.score += 300;
    addLog(state, 'MASTER QUARTERMASTER: Flawless inventory loadout conquered the dungeon depths!');
    return { reward, done: true };
  }

  // Defeat Checks
  if (state.adventurerHp <= 0) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'EXPEDITION FAILED: Adventurer fell in combat due to insufficient loadout.');
    return { reward, done: true };
  }

  if (state.gold < -200) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'BANKRUPT: Outfitting supplies drained all treasury funds.');
    return { reward, done: true };
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Expedition season concluded.');
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
    calculateLoadoutPower,
    getTotalWeight,
    ITEM_DEFS,
    MAX_TURNS
  };
}
