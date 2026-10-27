// Logic for 0118-class-based-progression: Trials of Mastery: Ascendant Classes
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const MAX_TURNS = 150;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

const TRIALS = [
  { id: 1, name: 'Training Automaton', hp: 50, maxHp: 50, atk: 12, def: 2 },
  { id: 2, name: 'Orc Marauder', hp: 80, maxHp: 80, atk: 18, def: 4 },
  { id: 3, name: 'Chimera Beast', hp: 125, maxHp: 125, atk: 24, def: 6 },
  { id: 4, name: 'Abyssal Warlock', hp: 165, maxHp: 165, atk: 30, def: 8 },
  { id: 5, name: 'Grand Champion Ignis', hp: 240, maxHp: 240, atk: 36, def: 10 }
];

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 543219876;

  const enemyData = TRIALS[0];
  const enemy = {
    id: enemyData.id,
    name: enemyData.name,
    hp: enemyData.hp,
    maxHp: enemyData.maxHp,
    atk: enemyData.atk,
    def: enemyData.def
  };

  return {
    seed,
    rngState: rngVal,
    trial: 1,
    maxTrials: 5,
    hero: {
      currentClass: 'novice',
      tier: 0,
      level: 1,
      xp: 0,
      jp: 1, // Start with 1 Job Point
      hp: 100,
      maxHp: 100,
      mp: 40,
      maxMp: 40,
      atk: 18,
      def: 4,
      critChance: 0.10,
      potions: 2,
      shield: 0,
      shadowVeil: false,
      skills: ['first_aid']
    },
    enemy,
    turnCount: 0,
    score: 0,
    done: false,
    victory: false,
    combatLog: ['Trial 1 begins: Facing the Training Automaton.']
  };
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const h = state.hero;

  // Battle actions
  actions.push('attack');
  actions.push('defend');

  if (h.potions > 0 && h.hp < h.maxHp) {
    actions.push('potion');
  }

  // Active Skills
  for (let i = 0; i < h.skills.length; i++) {
    const s = h.skills[i];
    if (s === 'first_aid' && h.mp >= 10 && h.hp < h.maxHp) {
      actions.push('skill:first_aid');
    } else if (s === 'cleave' && h.mp >= 12) {
      actions.push('skill:cleave');
    } else if (s === 'shield_wall' && h.mp >= 10) {
      actions.push('skill:shield_wall');
    } else if (s === 'quick_slash' && h.mp >= 10) {
      actions.push('skill:quick_slash');
    } else if (s === 'shadow_veil' && h.mp >= 15 && !h.shadowVeil) {
      actions.push('skill:shadow_veil');
    } else if (s === 'fireball' && h.mp >= 15) {
      actions.push('skill:fireball');
    } else if (s === 'mana_shield' && h.mp >= 12) {
      actions.push('skill:mana_shield');
    } else if (s === 'holy_smite' && h.mp >= 20) {
      actions.push('skill:holy_smite');
    } else if (s === 'death_mark' && h.mp >= 20) {
      actions.push('skill:death_mark');
    } else if (s === 'meteor' && h.mp >= 25) {
      actions.push('skill:meteor');
    }
  }

  // Class Evolution (Job Specialization)
  if (h.tier === 0 && h.level >= 2) {
    actions.push('evolve:warrior');
    actions.push('evolve:rogue');
    actions.push('evolve:mage');
  } else if (h.tier === 1 && h.level >= 4) {
    if (h.currentClass === 'warrior') actions.push('evolve:paladin');
    if (h.currentClass === 'rogue') actions.push('evolve:assassin');
    if (h.currentClass === 'mage') actions.push('evolve:archmage');
  }

  // Learn Skills via Job Points (JP)
  if (h.jp >= 1) {
    if (h.currentClass === 'warrior') {
      if (!h.skills.includes('cleave')) actions.push('learn:cleave');
      if (!h.skills.includes('shield_wall')) actions.push('learn:shield_wall');
    } else if (h.currentClass === 'rogue') {
      if (!h.skills.includes('quick_slash')) actions.push('learn:quick_slash');
      if (!h.skills.includes('shadow_veil')) actions.push('learn:shadow_veil');
    } else if (h.currentClass === 'mage') {
      if (!h.skills.includes('fireball')) actions.push('learn:fireball');
      if (!h.skills.includes('mana_shield')) actions.push('learn:mana_shield');
    } else if (h.currentClass === 'paladin') {
      if (!h.skills.includes('holy_smite')) actions.push('learn:holy_smite');
    } else if (h.currentClass === 'assassin') {
      if (!h.skills.includes('death_mark')) actions.push('learn:death_mark');
    } else if (h.currentClass === 'archmage') {
      if (!h.skills.includes('meteor')) actions.push('learn:meteor');
    }
  }

  return actions;
}

function resolveEnemyAttack(state, defending) {
  const e = state.enemy;
  const h = state.hero;

  if (e.hp <= 0) return;

  if (h.shadowVeil) {
    h.shadowVeil = false;
    state.combatLog.push(`Shadow Veil activated! You completely evaded ${e.name}'s attack!`);
    return;
  }

  let effectiveDef = h.def + (defending ? 8 : 0);
  const rawDmg = Math.max(3, e.atk - effectiveDef);

  let finalDmg = rawDmg;
  if (h.shield > 0) {
    if (h.shield >= finalDmg) {
      h.shield -= finalDmg;
      finalDmg = 0;
      state.combatLog.push(`Shield absorbed ${rawDmg} DMG!`);
    } else {
      finalDmg -= h.shield;
      h.shield = 0;
      state.combatLog.push(`Shield broke! Absorbed part of the impact.`);
    }
  }

  if (finalDmg > 0) {
    h.hp = Math.max(0, h.hp - finalDmg);
    state.combatLog.push(`${e.name} struck you for ${finalDmg} DMG!`);
  }
}

function checkOutcome(state) {
  if (state.hero.hp <= 0) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! The hero succumbed to trial injuries.');
    return;
  }

  if (state.enemy.hp <= 0) {
    state.score += 250;
    if (state.trial < state.maxTrials) {
      state.trial++;
      const nextE = TRIALS[state.trial - 1];
      state.enemy = {
        id: nextE.id,
        name: nextE.name,
        hp: nextE.hp,
        maxHp: nextE.maxHp,
        atk: nextE.atk,
        def: nextE.def
      };

      // Victory rewards: Level up and gain JP
      state.hero.level++;
      state.hero.jp += 2;
      state.hero.hp = state.hero.maxHp;
      state.hero.mp = state.hero.maxMp;
      state.hero.potions = Math.min(3, state.hero.potions + 1);
      state.combatLog.push(`Victory! Advanced to Level ${state.hero.level} (+2 JP). Trial ${state.trial} starts against ${state.enemy.name}!`);
    } else {
      // Grand Champion Vanquished!
      state.done = true;
      state.victory = true;
      state.score += 1000 + Math.max(0, 200 - state.turnCount * 4);
      state.combatLog.push('VICTORY! Grand Champion Ignis vanquished. Master of All Classes!');
    }
    return;
  }

  if (state.turnCount >= MAX_TURNS) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Turn limit exceeded in arena trial.');
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
  const e = state.enemy;

  let defending = false;

  if (action === 'attack') {
    const isCrit = nextRng(state) < h.critChance;
    const baseDmg = Math.max(4, h.atk - e.def);
    const dmg = isCrit ? Math.round(baseDmg * 1.6) : baseDmg;
    e.hp = Math.max(0, e.hp - dmg);
    state.score += dmg * 2;
    reward += 0.04;
    state.combatLog.push(`You attacked for ${dmg} DMG${isCrit ? ' [CRITICAL!]' : ''}!`);
  } else if (action === 'defend') {
    defending = true;
    h.mp = Math.min(h.maxMp, h.mp + 8);
    state.combatLog.push('Guarded and recovered 8 MP!');
  } else if (action === 'potion') {
    h.potions--;
    h.hp = Math.min(h.maxHp, h.hp + 40);
    reward += 0.02;
    state.combatLog.push('Drank a healing potion (+40 HP).');
  } else if (action === 'skill:first_aid') {
    h.mp -= 10;
    h.hp = Math.min(h.maxHp, h.hp + 30);
    reward += 0.02;
    state.combatLog.push('Applied First Aid (+30 HP).');
  } else if (action === 'skill:cleave') {
    h.mp -= 12;
    const dmg = Math.max(8, Math.round(h.atk * 1.45) - e.def);
    e.hp = Math.max(0, e.hp - dmg);
    state.score += dmg * 2;
    reward += 0.06;
    state.combatLog.push(`Cleave struck ${e.name} for ${dmg} DMG!`);
  } else if (action === 'skill:shield_wall') {
    h.mp -= 10;
    h.shield += 25;
    state.combatLog.push('Shield Wall raised! +25 Barrier Absorption.');
  } else if (action === 'skill:quick_slash') {
    h.mp -= 10;
    const hit1 = Math.max(3, Math.round(h.atk * 0.8) - e.def);
    const hit2 = Math.max(3, Math.round(h.atk * 0.8) - e.def);
    const totalDmg = hit1 + hit2;
    e.hp = Math.max(0, e.hp - totalDmg);
    state.score += totalDmg * 2;
    reward += 0.06;
    state.combatLog.push(`Quick Slash double-strike: ${hit1} + ${hit2} = ${totalDmg} DMG!`);
  } else if (action === 'skill:shadow_veil') {
    h.mp -= 15;
    h.shadowVeil = true;
    state.combatLog.push('Cloaked in Shadow Veil! Next enemy attack will miss.');
  } else if (action === 'skill:fireball') {
    h.mp -= 15;
    const dmg = Math.max(10, Math.round(h.atk * 1.6) - Math.floor(e.def / 2));
    e.hp = Math.max(0, e.hp - dmg);
    state.score += dmg * 3;
    reward += 0.08;
    state.combatLog.push(`Fireball erupted on ${e.name} for ${dmg} Spell DMG!`);
  } else if (action === 'skill:mana_shield') {
    h.mp -= 12;
    h.shield += 35;
    state.combatLog.push('Arcane Mana Shield active! +35 Barrier Absorption.');
  } else if (action === 'skill:holy_smite') {
    h.mp -= 20;
    const dmg = Math.max(16, Math.round(h.atk * 1.8) - e.def);
    e.hp = Math.max(0, e.hp - dmg);
    h.hp = Math.min(h.maxHp, h.hp + 20); // Divine lifesteal
    state.score += dmg * 3;
    reward += 0.1;
    state.combatLog.push(`Holy Smite smote ${e.name} for ${dmg} Holy DMG (+20 HP healed)!`);
  } else if (action === 'skill:death_mark') {
    h.mp -= 20;
    const dmg = Math.max(22, Math.round(h.atk * 2.2) - e.def);
    e.hp = Math.max(0, e.hp - dmg);
    state.score += dmg * 3;
    reward += 0.1;
    state.combatLog.push(`Death Mark executed ${e.name} for ${dmg} CRITICAL DMG!`);
  } else if (action === 'skill:meteor') {
    h.mp -= 25;
    const dmg = Math.max(28, Math.round(h.atk * 2.5) - Math.floor(e.def / 2));
    e.hp = Math.max(0, e.hp - dmg);
    state.score += dmg * 4;
    reward += 0.12;
    state.combatLog.push(`Cataclysm Meteor scorched ${e.name} for ${dmg} Astral DMG!`);
  } else if (action.startsWith('evolve:')) {
    const newClass = action.slice(7);
    h.currentClass = newClass;
    if (newClass === 'warrior') {
      h.tier = 1;
      h.atk += 6;
      h.def += 4;
      h.maxHp += 30;
      h.hp += 30;
    } else if (newClass === 'rogue') {
      h.tier = 1;
      h.atk += 8;
      h.critChance += 0.15;
    } else if (newClass === 'mage') {
      h.tier = 1;
      h.atk += 10;
      h.maxMp += 30;
      h.mp += 30;
    } else if (newClass === 'paladin') {
      h.tier = 2;
      h.atk += 10;
      h.def += 6;
      h.maxHp += 40;
      h.hp += 40;
    } else if (newClass === 'assassin') {
      h.tier = 2;
      h.atk += 14;
      h.critChance += 0.20;
    } else if (newClass === 'archmage') {
      h.tier = 2;
      h.atk += 18;
      h.maxMp += 40;
      h.mp += 40;
    }
    state.score += 150;
    reward += 0.1;
    state.combatLog.push(`Class Ascended! Hero is now a ${newClass.toUpperCase()} (Tier ${h.tier})!`);
  } else if (action.startsWith('learn:')) {
    const skillName = action.slice(6);
    h.skills.push(skillName);
    h.jp--;
    state.score += 80;
    reward += 0.05;
    state.combatLog.push(`Learned new skill: ${skillName}!`);
  }

  // Enemy counter-attack if battle action was taken and enemy survived
  if (!action.startsWith('evolve:') && !action.startsWith('learn:')) {
    if (e.hp > 0) {
      resolveEnemyAttack(state, defending);
    }
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
