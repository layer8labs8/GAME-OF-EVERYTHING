// Pure deterministic simulation logic for 0109-rpg (Hero's Quest)

const MAX_TURNS = 50;

const ZONES = [
  {
    id: 1,
    name: 'Whispering Woods',
    enemy: { name: 'Dire Wolf', hp: 35, maxHp: 35, atk: 10, def: 2, xp: 50, gold: 25 }
  },
  {
    id: 2,
    name: 'Sunken Catacombs',
    enemy: { name: 'Skeleton Warlord', hp: 60, maxHp: 60, atk: 15, def: 4, xp: 80, gold: 40 }
  },
  {
    id: 3,
    name: 'Dragonfang Ridge',
    enemy: { name: 'Mountain Troll', hp: 90, maxHp: 90, atk: 22, def: 6, xp: 120, gold: 60 }
  },
  {
    id: 4,
    name: 'Shadow Citadel',
    enemy: { name: 'Black Knight', hp: 130, maxHp: 130, atk: 28, def: 8, xp: 160, gold: 80 }
  },
  {
    id: 5,
    name: 'Throne of Chaos',
    enemy: { name: 'Abyssal Dragon', hp: 200, maxHp: 200, atk: 35, def: 10, xp: 300, gold: 150 }
  }
];

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6a09e667, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 109109) {
  const numSeed = typeof seed === 'number' ? seed : 109109;

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    zoneIndex: 0,
    hero: {
      name: 'Aethelgard',
      level: 1,
      xp: 0,
      xpNext: 50,
      statPoints: 0,
      gold: 30,
      str: 12,
      agi: 10,
      int: 10,
      hp: 80,
      maxHp: 80,
      mp: 40,
      maxMp: 40,
      weaponTier: 1, // Tier 1: Iron (0), Tier 2: Steel (+8), Tier 3: Runeblade (+16)
      armorTier: 1,  // Tier 1: Leather (0), Tier 2: Mail (+6), Tier 3: Plate (+12)
      potionsHp: 2,
      potionsMp: 1,
      defending: false
    },
    enemy: { ...ZONES[0].enemy },
    statePhase: 'combat', // 'combat' | 'camp'
    history: ['Hero enters the Whispering Woods. A savage Dire Wolf attacks!'],
    winner: null,
    done: false
  };
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const h = state.hero;

  // 1. Attribute Allocation priority
  if (h.statPoints > 0) {
    actions.push('stat_boost:str');
    actions.push('stat_boost:agi');
    actions.push('stat_boost:int');
    return actions;
  }

  // 2. Camp / Merchant Phase
  if (state.statePhase === 'camp') {
    actions.push('travel_next_zone');
    if (h.gold >= 50 && h.weaponTier < 3) {
      actions.push('buy_upgrade:weapon');
    }
    if (h.gold >= 45 && h.armorTier < 3) {
      actions.push('buy_upgrade:armor');
    }
    if (h.gold >= 20) {
      actions.push('buy_potion:hp');
      actions.push('buy_potion:mp');
    }
    return actions;
  }

  // 3. Combat Phase
  actions.push('attack');
  if (h.mp >= 12) {
    actions.push('cast_fireball');
  }
  if (h.mp >= 10 && h.hp < h.maxHp) {
    actions.push('cast_heal');
  }
  actions.push('defend');
  if (h.potionsHp > 0 && h.hp < h.maxHp) {
    actions.push('use_potion:hp');
  }
  if (h.potionsMp > 0 && h.mp < h.maxMp) {
    actions.push('use_potion:mp');
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const valid = legalActions(state);
  if (!valid.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  const h = state.hero;
  const e = state.enemy;

  // Stat allocation
  if (action === 'stat_boost:str') {
    h.str += 3;
    h.maxHp += 10;
    h.hp = Math.min(h.maxHp, h.hp + 10);
    h.statPoints--;
    state.history.push(`Attribute point invested: Strength increased to ${h.str} (+10 Max HP).`);
    reward += 5;
    return { reward, done: state.done };
  } else if (action === 'stat_boost:agi') {
    h.agi += 3;
    h.maxHp += 6;
    h.hp = Math.min(h.maxHp, h.hp + 6);
    h.statPoints--;
    state.history.push(`Attribute point invested: Agility increased to ${h.agi}.`);
    reward += 5;
    return { reward, done: state.done };
  } else if (action === 'stat_boost:int') {
    h.int += 3;
    h.maxMp += 10;
    h.mp = Math.min(h.maxMp, h.mp + 10);
    h.statPoints--;
    state.history.push(`Attribute point invested: Intellect increased to ${h.int} (+10 Max MP).`);
    reward += 5;
    return { reward, done: state.done };
  }

  // Camp actions
  if (action === 'travel_next_zone') {
    state.zoneIndex++;
    state.enemy = { ...ZONES[state.zoneIndex].enemy };
    state.statePhase = 'combat';
    state.turn++;
    reward += 15;
    state.history.push(`Advanced into ${ZONES[state.zoneIndex].name}! Confronting ${state.enemy.name}!`);
    return { reward, done: state.done };
  } else if (action === 'buy_upgrade:weapon') {
    h.gold -= 50;
    h.weaponTier++;
    reward += 10;
    const name = h.weaponTier === 2 ? 'Steel Longsword' : 'Runic Greatsword';
    state.history.push(`Forged weapon upgrade: Equipped ${name} (+8 Attack Power).`);
    return { reward, done: state.done };
  } else if (action === 'buy_upgrade:armor') {
    h.gold -= 45;
    h.armorTier++;
    reward += 10;
    const name = h.armorTier === 2 ? 'Chainmail Hauberk' : 'Knightly Full Plate';
    state.history.push(`Purchased armor upgrade: Equipped ${name} (+6 Armor Defense).`);
    return { reward, done: state.done };
  } else if (action === 'buy_potion:hp') {
    h.gold -= 20;
    h.potionsHp++;
    reward += 2;
    state.history.push('Purchased restorative Health Potion from wandering apothecary.');
    return { reward, done: state.done };
  } else if (action === 'buy_potion:mp') {
    h.gold -= 20;
    h.potionsMp++;
    reward += 2;
    state.history.push('Purchased glowing Mana Draught from wandering apothecary.');
    return { reward, done: state.done };
  }

  // Combat Player Turn
  if (action === 'attack') {
    const weaponAtk = (h.weaponTier - 1) * 8;
    const rawDmg = Math.floor(h.str * 1.4 + weaponAtk - e.def);
    const dmg = Math.max(3, rawDmg);
    e.hp = Math.max(0, e.hp - dmg);
    reward += 5;
    state.history.push(`Hero slashed ${e.name} with blade for ${dmg} damage!`);
  } else if (action === 'cast_fireball') {
    h.mp -= 12;
    const dmg = Math.floor(h.int * 2.3);
    e.hp = Math.max(0, e.hp - dmg);
    reward += 8;
    state.history.push(`Incantation cast! Fiery blast engulfed ${e.name} for ${dmg} magical damage!`);
  } else if (action === 'cast_heal') {
    h.mp -= 10;
    const heal = Math.floor(h.int * 2.4);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    reward += 4;
    state.history.push(`Holy restorative hymn restored ${heal} HP.`);
  } else if (action === 'defend') {
    h.defending = true;
    h.mp = Math.min(h.maxMp, h.mp + 6);
    reward += 3;
    state.history.push('Hero raised defensive guard and focused mind (+6 MP).');
  } else if (action === 'use_potion:hp') {
    h.potionsHp--;
    h.hp = Math.min(h.maxHp, h.hp + 45);
    reward += 3;
    state.history.push('Quaffed Health Potion (+45 HP restored).');
  } else if (action === 'use_potion:mp') {
    h.potionsMp--;
    h.mp = Math.min(h.maxMp, h.mp + 30);
    reward += 3;
    state.history.push('Quaffed Mana Potion (+30 MP restored).');
  }

  // Check if monster was slain
  if (e.hp <= 0) {
    reward += 25;
    h.xp += e.xp;
    h.gold += e.gold;
    state.history.push(`VICTORY! Slew ${e.name}! Earned +${e.xp} XP and +${e.gold} Gold.`);

    // Check level up
    while (h.xp >= h.xpNext) {
      h.level++;
      h.xp -= h.xpNext;
      h.xpNext = Math.floor(h.xpNext * 1.5);
      h.statPoints += 2;
      h.hp = h.maxHp;
      h.mp = h.maxMp;
      reward += 20;
      state.history.push(`LEVEL UP! Reached Hero Level ${h.level}! 2 Stat Points ready to allocate.`);
    }

    // Check game triumph (Zone 5 cleared)
    if (state.zoneIndex >= ZONES.length - 1) {
      state.done = true;
      state.winner = 'player';
      state.history.push('EPIC QUEST COMPLETE! Slew the Abyssal Dragon and saved the realm of Aethelgard!');
      reward += 150;
      return { reward, done: true };
    }

    // Transition to camp phase
    state.statePhase = 'camp';
    state.history.push('The area is secured. Rested by campfire; traveling merchant offers wares.');
    return { reward, done: false };
  }

  // Enemy counter-attack
  const armorVal = (h.armorTier - 1) * 6;
  let incoming = Math.max(3, e.atk - armorVal);
  if (h.defending) {
    incoming = Math.max(1, Math.floor(incoming * 0.5));
  }
  h.hp = Math.max(0, h.hp - incoming);
  h.defending = false;
  state.history.push(`${e.name} retaliated, striking Hero for ${incoming} damage!`);

  // Check hero defeat
  if (h.hp <= 0) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('DEFEAT: Hero collapsed in battle. Darkness blankets the realm.');
    reward -= 60;
    return { reward, done: true };
  }

  state.turn++;
  if (state.turn >= state.maxTurns) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('QUEST TIMEOUT: Exhaustion overcame the hero.');
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  const h = state.hero;
  const zoneBonus = (state.zoneIndex + 1) * 60;
  const levelBonus = h.level * 40;
  const gearBonus = (h.weaponTier + h.armorTier) * 25;
  const goldBonus = Math.floor(h.gold * 0.8);
  const hpBonus = h.hp * 2;

  let total = zoneBonus + levelBonus + gearBonus + goldBonus + hpBonus;
  if (state.winner === 'player') total += 250;
  return Math.max(0, total);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    ZONES
  };
}