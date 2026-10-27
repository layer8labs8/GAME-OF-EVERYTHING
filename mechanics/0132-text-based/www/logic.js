/**
 * 0132-text-based: Kingdom of Text
 * Pure game logic module conforming to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEAPON_TIERS = [
  { name: 'Rusty Blade', atk: 4, cost: 0 },
  { name: 'Steel Longsword', atk: 10, cost: 40 },
  { name: 'Sunfire Claymore', atk: 20, cost: 90 }
];

const ARMOR_TIERS = [
  { name: 'Padded Tunic', def: 2, cost: 0 },
  { name: 'Chainmail Hauberk', def: 6, cost: 35 },
  { name: 'Dragon Scale Cuirass', def: 14, cost: 80 }
];

const MONSTER_TEMPLATES = {
  darkwood: [
    { name: 'Dire Wolf', hp: 35, atk: 8, def: 2, goldReward: 15, xpReward: 35, isBoss: false },
    { name: 'Forest Bandit', hp: 45, atk: 11, def: 3, goldReward: 25, xpReward: 50, isBoss: false }
  ],
  crypt: [
    { name: 'Skeleton Knight', hp: 60, atk: 14, def: 5, goldReward: 35, xpReward: 70, isBoss: false },
    { name: 'Shadow Necromancer', hp: 80, atk: 18, def: 6, goldReward: 55, xpReward: 110, isBoss: false }
  ],
  wyrm_peak: [
    { name: 'Ignis the Dread', hp: 170, atk: 24, def: 8, goldReward: 150, xpReward: 300, isBoss: true }
  ]
};

function createState(seed = 1) {
  const rng = createPrng(seed);
  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    location: 'town',
    player: {
      hp: 100,
      maxHp: 100,
      mana: 40,
      maxMana: 40,
      level: 1,
      xp: 0,
      gold: 25,
      potions: 2,
      weaponTier: 0,
      armorTier: 0,
      hasRelic: false
    },
    enemy: null,
    defending: false,
    score: 0,
    done: false,
    victory: false,
    shrineBlessed: false,
    cryptChestClaimed: false,
    log: [
      'Welcome to Oakhaven, brave adventurer.',
      'Prepare your gear before venturing into the wilderness.'
    ]
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

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function canChallengeBoss(state) {
  return state.player.level >= 3 || state.player.hasRelic;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // In active combat
  if (state.enemy !== null) {
    actions.push('combat:strike');
    if (state.player.mana >= 15) {
      actions.push('combat:cast_fireball');
    }
    if (state.player.mana >= 15 && state.player.hp < state.player.maxHp) {
      actions.push('combat:heal_spell');
    }
    actions.push('combat:defend');
    if (state.player.potions > 0 && state.player.hp < state.player.maxHp) {
      actions.push('combat:drink_potion');
    }
    if (!state.enemy.isBoss) {
      actions.push('combat:flee');
    }
    return actions;
  }

  // Not in combat
  if (state.location === 'town') {
    actions.push('explore:darkwood');
    actions.push('explore:crypt');
    if (canChallengeBoss(state)) {
      actions.push('explore:wyrm_peak');
    }

    if (state.player.gold >= 10 && (state.player.hp < state.player.maxHp || state.player.mana < state.player.maxMana)) {
      actions.push('town:rest');
    }
    if (state.player.gold >= 15 && state.player.potions < 5) {
      actions.push('town:buy_potion');
    }
    if (state.player.weaponTier < WEAPON_TIERS.length - 1) {
      const nextWpn = WEAPON_TIERS[state.player.weaponTier + 1];
      if (state.player.gold >= nextWpn.cost) {
        actions.push('town:buy_weapon');
      }
    }
    if (state.player.armorTier < ARMOR_TIERS.length - 1) {
      const nextArm = ARMOR_TIERS[state.player.armorTier + 1];
      if (state.player.gold >= nextArm.cost) {
        actions.push('town:buy_armor');
      }
    }
    return actions;
  }

  // Out in exploring regions with no active enemy
  actions.push('action:return_town');
  actions.push('explore:' + state.location);

  if (state.location === 'darkwood' && !state.shrineBlessed) {
    actions.push('action:pray_shrine');
  }
  if (state.location === 'crypt' && !state.cryptChestClaimed) {
    actions.push('action:open_chest');
  }

  return actions;
}

function addLog(state, message) {
  state.log.push(message);
  if (state.log.length > 20) {
    state.log.shift();
  }
}

function checkLevelUp(state) {
  const xpNeeded = state.player.level * 100;
  if (state.player.xp >= xpNeeded && state.player.level < 5) {
    state.player.level += 1;
    state.player.xp -= xpNeeded;
    state.player.maxHp += 20;
    state.player.hp = state.player.maxHp;
    state.player.maxMana += 10;
    state.player.mana = state.player.maxMana;
    state.score += 30;
    addLog(state, `LEVEL UP! You attained Level ${state.player.level}! Stats fully refreshed.`);
  }
}

function spawnMonster(state, region) {
  const templates = MONSTER_TEMPLATES[region];
  if (!templates || templates.length === 0) return;
  const rand = getRng(state);
  const idx = Math.floor(rand * templates.length);
  const tpl = templates[idx];
  state.enemy = {
    id: tpl.name.toLowerCase().replace(/\s+/g, '_'),
    name: tpl.name,
    hp: tpl.hp,
    maxHp: tpl.hp,
    atk: tpl.atk,
    def: tpl.def,
    goldReward: tpl.goldReward,
    xpReward: tpl.xpReward,
    isBoss: tpl.isBoss
  };
  addLog(state, `Encounter! A ferocious ${tpl.name} emerges to strike!`);
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Handle town actions
  if (action === 'town:rest') {
    state.player.gold -= 10;
    state.player.hp = state.player.maxHp;
    state.player.mana = state.player.maxMana;
    reward += 5;
    addLog(state, 'You rested at the Starlight Tavern. Health and Mana restored to maximum.');
  } else if (action === 'town:buy_potion') {
    state.player.gold -= 15;
    state.player.potions += 1;
    reward += 2;
    addLog(state, `Purchased a Healing Potion from the Herbalist. Total: ${state.player.potions}`);
  } else if (action === 'town:buy_weapon') {
    state.player.weaponTier += 1;
    const wpn = WEAPON_TIERS[state.player.weaponTier];
    state.player.gold -= wpn.cost;
    reward += 10;
    state.score += 15;
    addLog(state, `Forged ${wpn.name}! Attack increased to +${wpn.atk}.`);
  } else if (action === 'town:buy_armor') {
    state.player.armorTier += 1;
    const arm = ARMOR_TIERS[state.player.armorTier];
    state.player.gold -= arm.cost;
    reward += 10;
    state.score += 15;
    addLog(state, `Equipped ${arm.name}! Defense increased to +${arm.def}.`);
  }

  // Handle exploration & navigation
  else if (action.startsWith('explore:')) {
    const targetRegion = action.split(':')[1];
    state.location = targetRegion;
    state.defending = false;
    spawnMonster(state, targetRegion);
    reward += 1;
  } else if (action === 'action:return_town') {
    state.location = 'town';
    state.enemy = null;
    state.defending = false;
    addLog(state, 'You safely returned to the gates of Oakhaven.');
    reward += 1;
  } else if (action === 'action:pray_shrine') {
    state.shrineBlessed = true;
    state.player.maxHp += 15;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 15);
    state.player.maxMana += 15;
    state.player.mana = Math.min(state.player.maxMana, state.player.mana + 15);
    state.score += 25;
    reward += 15;
    addLog(state, 'You knelt at the Shrine of Dawn. Ancient light permanently expands your vitality and spirit!');
  } else if (action === 'action:open_chest') {
    state.cryptChestClaimed = true;
    state.player.hasRelic = true;
    state.player.gold += 60;
    state.player.potions += 2;
    state.score += 40;
    reward += 20;
    addLog(state, 'You opened the Crypt Reliquary! Discovered Ancient Relic, 60 gold, and 2 potions.');
  }

  // Handle combat actions
  else if (action.startsWith('combat:')) {
    const enemy = state.enemy;
    const wpnAtk = WEAPON_TIERS[state.player.weaponTier].atk;
    const armDef = ARMOR_TIERS[state.player.armorTier].def;

    if (action === 'combat:strike') {
      const baseDmg = 12 + state.player.level * 3 + wpnAtk;
      const netDmg = Math.max(3, baseDmg - enemy.def);
      enemy.hp -= netDmg;
      reward += 2;
      addLog(state, `You struck ${enemy.name} with your blade for ${netDmg} damage!`);
    } else if (action === 'combat:cast_fireball') {
      state.player.mana -= 15;
      const fireDmg = 28 + state.player.level * 5;
      enemy.hp -= fireDmg;
      reward += 4;
      addLog(state, `Incantation released! Searing flame engulfs ${enemy.name} for ${fireDmg} elemental damage!`);
    } else if (action === 'combat:heal_spell') {
      state.player.mana -= 15;
      const healAmount = 35;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmount);
      reward += 3;
      addLog(state, `Holy light soothes your wounds, recovering ${healAmount} HP.`);
    } else if (action === 'combat:drink_potion') {
      state.player.potions -= 1;
      const healAmount = 50;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmount);
      reward += 2;
      addLog(state, `Quaffed healing elixir, recovering ${healAmount} HP.`);
    } else if (action === 'combat:defend') {
      state.defending = true;
      state.player.mana = Math.min(state.player.maxMana, state.player.mana + 10);
      reward += 1;
      addLog(state, 'Raised your guard in high defense posture, focusing spirit (+10 Mana).');
    } else if (action === 'combat:flee') {
      state.location = 'town';
      state.enemy = null;
      state.defending = false;
      reward -= 5;
      addLog(state, 'You executed a tactical retreat back to Oakhaven sanctuary.');
      return { reward, done: false };
    }

    // Check if enemy defeated
    if (enemy.hp <= 0) {
      addLog(state, `Victory! You defeated ${enemy.name}! Gained +${enemy.goldReward} Gold, +${enemy.xpReward} XP.`);
      state.player.gold += enemy.goldReward;
      state.player.xp += enemy.xpReward;
      state.score += (enemy.isBoss ? 150 : 25);
      reward += (enemy.isBoss ? 80 : 15);

      if (enemy.isBoss) {
        state.victory = true;
        state.done = true;
        reward += 100;
        addLog(state, 'TRIUMPH! Ignis the Dread has fallen! Peace is forever restored to Aethelgard!');
        state.enemy = null;
        return { reward, done: true };
      }

      state.enemy = null;
      checkLevelUp(state);
    } else {
      // Enemy counter-attacks
      let incomingDmg = enemy.atk;
      if (state.defending) {
        incomingDmg = Math.floor(incomingDmg * 0.4);
        state.defending = false;
      }
      const finalDmg = Math.max(1, incomingDmg - Math.floor(armDef * 0.6));
      state.player.hp -= finalDmg;
      addLog(state, `${enemy.name} retaliated, striking you for ${finalDmg} damage.`);

      if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.done = true;
        reward -= 50;
        addLog(state, 'Defeat... Your vitality collapsed beneath the weight of combat.');
        return { reward, done: true };
      }
    }
  }

  // Turn limit termination
  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'The chronicle draws to a close as the timeline reaches its bound.');
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
    WEAPON_TIERS,
    ARMOR_TIERS
  };
}
