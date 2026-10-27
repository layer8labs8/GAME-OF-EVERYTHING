// Logic for 0119-loot: Vault Hunter: Abyssal Relics
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const MAX_TURNS = 150;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

const VAULT_MONSTERS = [
  { id: 1, name: 'Scavenger Marauder', hp: 45, maxHp: 45, atk: 12, def: 2 },
  { id: 2, name: 'Ironclad Sentry', hp: 75, maxHp: 75, atk: 18, def: 5 },
  { id: 3, name: 'Nether Fiend', hp: 110, maxHp: 110, atk: 25, def: 8 },
  { id: 4, name: 'Chaos Behemoth', hp: 160, maxHp: 160, atk: 32, def: 11 },
  { id: 5, name: 'The Vault Sovereign', hp: 240, maxHp: 240, atk: 40, def: 14 }
];

const RARITY_TABLE = {
  common: { name: 'Common', multiplier: 1.0, scrap: 15, color: '#8b949e' },
  rare: { name: 'Rare', multiplier: 1.35, scrap: 35, color: '#58a6ff' },
  epic: { name: 'Epic', multiplier: 1.8, scrap: 75, color: '#bc8cff' },
  legendary: { name: 'Legendary', multiplier: 2.5, scrap: 160, color: '#f0883e' }
};

function rollLootDrop(state, vaultLevel) {
  const roll = nextRng(state);
  let rarity = 'common';
  if (vaultLevel === 1) {
    rarity = roll < 0.35 ? 'rare' : 'common';
  } else if (vaultLevel === 2) {
    if (roll < 0.15) rarity = 'epic';
    else if (roll < 0.55) rarity = 'rare';
    else rarity = 'common';
  } else if (vaultLevel === 3) {
    if (roll < 0.12) rarity = 'legendary';
    else if (roll < 0.45) rarity = 'epic';
    else if (roll < 0.85) rarity = 'rare';
    else rarity = 'common';
  } else if (vaultLevel === 4) {
    if (roll < 0.35) rarity = 'legendary';
    else if (roll < 0.80) rarity = 'epic';
    else rarity = 'rare';
  } else {
    // Vault 5
    rarity = roll < 0.65 ? 'legendary' : 'epic';
  }

  const slotRoll = nextRng(state);
  const mult = RARITY_TABLE[rarity].multiplier;

  if (slotRoll < 0.45) {
    // Weapon
    const baseAtk = 8 + vaultLevel * 4;
    const atk = Math.round(baseAtk * mult);
    return {
      id: 'w_' + Math.floor(nextRng(state) * 100000),
      name: `${rarity.toUpperCase()} Blade`,
      slot: 'weapon',
      rarity,
      atk,
      level: 0
    };
  } else if (slotRoll < 0.80) {
    // Armor
    const baseDef = 3 + vaultLevel * 2;
    const def = Math.round(baseDef * mult);
    return {
      id: 'a_' + Math.floor(nextRng(state) * 100000),
      name: `${rarity.toUpperCase()} Plate`,
      slot: 'armor',
      rarity,
      def,
      level: 0
    };
  } else {
    // Relic
    const baseBonusHp = 15 + vaultLevel * 10;
    const bonusHp = Math.round(baseBonusHp * mult);
    return {
      id: 'r_' + Math.floor(nextRng(state) * 100000),
      name: `${rarity.toUpperCase()} Sigil`,
      slot: 'relic',
      rarity,
      bonusHp,
      level: 0
    };
  }
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 987654321;

  const firstE = VAULT_MONSTERS[0];
  const monster = {
    id: firstE.id,
    name: firstE.name,
    hp: firstE.hp,
    maxHp: firstE.maxHp,
    atk: firstE.atk,
    def: firstE.def
  };

  const equipment = {
    weapon: { id: 'w0', name: 'Rusted Iron Sword', slot: 'weapon', rarity: 'common', atk: 12, level: 0 },
    armor: { id: 'a0', name: 'Tattered Leather Tunic', slot: 'armor', rarity: 'common', def: 4, level: 0 },
    relic: { id: 'r0', name: 'Tarnished Bronze Ring', slot: 'relic', rarity: 'common', bonusHp: 15, level: 0 }
  };

  return {
    seed,
    rngState: rngVal,
    vault: 1,
    maxVaults: 5,
    hero: {
      hp: 115,
      maxHp: 115,
      mp: 40,
      maxMp: 40,
      scrap: 20,
      potions: 2,
      equipment,
      inventory: []
    },
    monster,
    turnCount: 0,
    score: 0,
    done: false,
    victory: false,
    combatLog: ['Vault 1 unsealed: Scavenger Marauder encountered!']
  };
}

function getHeroTotalAtk(state) {
  const w = state.hero.equipment.weapon;
  return w.atk + w.level * 4;
}

function getHeroTotalDef(state) {
  const a = state.hero.equipment.armor;
  return a.def + a.level * 3;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const h = state.hero;
  const m = state.monster;

  // Combat actions if monster alive
  if (m.hp > 0) {
    actions.push('attack');
    if (h.mp >= 15) {
      actions.push('skill');
    }
    if (h.potions > 0 && h.hp < h.maxHp) {
      actions.push('heal');
    }
  } else if (state.vault < state.maxVaults) {
    // Next vault progression if monster is dead
    actions.push('next_vault');
  }

  // Equipment & Inventory management
  for (let i = 0; i < h.inventory.length; i++) {
    actions.push(`equip:${i}`);
    actions.push(`salvage:${i}`);
  }

  // Blacksmith upgrades
  const upgradeCost = 40;
  if (h.scrap >= upgradeCost) {
    actions.push('upgrade:weapon');
    actions.push('upgrade:armor');
    actions.push('upgrade:relic');
  }

  return actions;
}

function checkOutcome(state) {
  if (state.hero.hp <= 0) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! The vault hunter fell in the abyssal crypt.');
    return;
  }

  // Check victory: Vault 5 boss dead
  if (state.vault === state.maxVaults && state.monster.hp <= 0) {
    state.done = true;
    state.victory = true;
    state.score += 1200 + Math.max(0, 200 - state.turnCount * 4);
    state.combatLog.push('VICTORY! The Vault Sovereign slain. Prismatic Relic secured!');
    return;
  }

  if (state.turnCount >= MAX_TURNS) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Turn limit exceeded in vault extraction.');
  }
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  state.turnCount++;
  let reward = 0.0;
  const h = state.hero;
  const m = state.monster;

  if (action === 'attack') {
    const atkPower = getHeroTotalAtk(state);
    const dmg = Math.max(5, atkPower - m.def);
    m.hp = Math.max(0, m.hp - dmg);
    state.score += dmg * 2;
    reward += 0.04;
    state.combatLog.push(`You swung your weapon for ${dmg} DMG!`);

    // Slay check & loot explosion
    if (m.hp === 0) {
      state.score += 200;
      reward += 0.2;
      state.combatLog.push(`${m.name} shattered! LOOT EXPLOSION!`);

      // Roll 2 loot drops
      for (let d = 0; d < 2; d++) {
        if (h.inventory.length < 8) {
          const loot = rollLootDrop(state, state.vault);
          h.inventory.push(loot);
          state.combatLog.push(`Found: [${loot.rarity.toUpperCase()}] ${loot.name}!`);
        }
      }
    }
  } else if (action === 'skill') {
    h.mp -= 15;
    const atkPower = getHeroTotalAtk(state);
    const dmg = Math.max(12, Math.round(atkPower * 1.65) - m.def);
    m.hp = Math.max(0, m.hp - dmg);
    state.score += dmg * 3;
    reward += 0.06;
    state.combatLog.push(`Abyssal Strike blasted ${m.name} for ${dmg} DMG!`);

    if (m.hp === 0) {
      state.score += 200;
      reward += 0.2;
      state.combatLog.push(`${m.name} obliterated! LOOT EXPLOSION!`);

      for (let d = 0; d < 2; d++) {
        if (h.inventory.length < 8) {
          const loot = rollLootDrop(state, state.vault);
          h.inventory.push(loot);
          state.combatLog.push(`Found: [${loot.rarity.toUpperCase()}] ${loot.name}!`);
        }
      }
    }
  } else if (action === 'heal') {
    h.potions--;
    h.hp = Math.min(h.maxHp, h.hp + 45);
    state.combatLog.push('Chugged a healing potion (+45 HP).');
  } else if (action.startsWith('equip:')) {
    const idx = Number(action.slice(6));
    const item = h.inventory[idx];
    const oldItem = h.equipment[item.slot];

    // Swap
    h.equipment[item.slot] = item;
    h.inventory.splice(idx, 1);
    h.inventory.push(oldItem);

    // Recalculate relic HP bonus if relic swapped
    if (item.slot === 'relic') {
      const baseMax = 100;
      h.maxHp = baseMax + (item.bonusHp || 0) + item.level * 15;
      h.hp = Math.min(h.maxHp, h.hp + 20);
    }

    state.score += 50;
    reward += 0.05;
    state.combatLog.push(`Equipped [${item.rarity.toUpperCase()}] ${item.name}!`);
  } else if (action.startsWith('salvage:')) {
    const idx = Number(action.slice(8));
    const item = h.inventory[idx];
    const scrapGained = RARITY_TABLE[item.rarity].scrap;
    h.scrap += scrapGained;
    h.inventory.splice(idx, 1);
    state.score += 30;
    state.combatLog.push(`Salvaged ${item.name} for +${scrapGained} Scrap.`);
  } else if (action.startsWith('upgrade:')) {
    const slot = action.slice(8);
    const item = h.equipment[slot];
    h.scrap -= 40;
    item.level++;
    if (slot === 'relic') {
      h.maxHp += 15;
      h.hp += 15;
    }
    state.score += 80;
    reward += 0.08;
    state.combatLog.push(`Upgraded equipped ${slot} to +${item.level}!`);
  } else if (action === 'next_vault') {
    state.vault++;
    state.score += 300;
    reward += 0.25;

    const nextE = VAULT_MONSTERS[state.vault - 1];
    state.monster = {
      id: nextE.id,
      name: nextE.name,
      hp: nextE.hp,
      maxHp: nextE.maxHp,
      atk: nextE.atk,
      def: nextE.def
    };

    // Refill some MP and HP between vaults
    h.hp = Math.min(h.maxHp, h.hp + 30);
    h.mp = h.maxMp;
    h.potions = Math.min(3, h.potions + 1);

    state.combatLog.push(`Descended into Vault ${state.vault}: ${state.monster.name} awaits!`);
    checkOutcome(state);
    return { reward, done: state.done };
  }

  // Monster counter-attacks if still alive during battle action
  if (m.hp > 0 && (action === 'attack' || action === 'skill' || action === 'heal')) {
    const heroDef = getHeroTotalDef(state);
    const mDmg = Math.max(3, m.atk - heroDef);
    h.hp = Math.max(0, h.hp - mDmg);
    state.combatLog.push(`${m.name} counter-attacked for ${mDmg} DMG!`);
  }

  // Outcome check
  checkOutcome(state);

  return { reward: state.victory ? 1.0 : (state.done ? 0.0 : reward), done: state.done };
}

function isOver(state) {
  return Boolean(state.done);
}

function score(state) {
  return state.score;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
