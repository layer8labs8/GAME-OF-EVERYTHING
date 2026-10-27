// Logic for 0120-character-customization: Avatar of Destiny
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const MAX_TURNS = 150;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

const TRIALS = [
  { id: 1, name: 'Stone Sentinel', hp: 60, maxHp: 60, atk: 14, def: 8 },
  { id: 2, name: 'Phantom Skirmisher', hp: 85, maxHp: 85, atk: 22, def: 3 },
  { id: 3, name: 'Abyssal Warlock', hp: 125, maxHp: 125, atk: 28, def: 4 },
  { id: 4, name: 'Mirror Doppelgänger', hp: 180, maxHp: 180, atk: 35, def: 8 }
];

function recalculateStats(hero) {
  const bonusHpTrait = hero.trait === 'ironborn' ? 25 : 0;
  const bonusMpTrait = hero.trait === 'spellweaver' ? 30 : 0;
  const bonusDefTrait = hero.trait === 'guardian' ? 4 : 0;
  const bonusCritTrait = hero.trait === 'shadowblade' ? 0.12 : 0.0;

  hero.maxHp = 60 + hero.con * 12 + bonusHpTrait;
  hero.maxMp = 20 + hero.int * 6 + bonusMpTrait;

  let weaponBonusAtk = 0;
  if (hero.weapon === 'greatsword') weaponBonusAtk = Math.round(hero.str * 1.2);
  else if (hero.weapon === 'daggers') weaponBonusAtk = Math.round(hero.dex * 1.0);

  hero.atk = 8 + Math.round(hero.str * 2.2) + weaponBonusAtk;
  hero.spellAtk = 12 + Math.round(hero.int * 3.4) + (hero.weapon === 'staff' ? Math.round(hero.int * 1.5) : 0);
  hero.def = 2 + Math.round(hero.str * 0.8) + bonusDefTrait;
  hero.critChance = 0.05 + hero.dex * 0.018 + bonusCritTrait;
  hero.dodgeChance = 0.05 + hero.dex * 0.015;

  if (hero.hp > hero.maxHp) hero.hp = hero.maxHp;
  if (hero.mp > hero.maxMp) hero.mp = hero.maxMp;
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 123456789;

  const hero = {
    str: 5,
    dex: 5,
    int: 5,
    con: 5,
    statPoints: 8,
    trait: 'ironborn', // Default trait
    weapon: 'greatsword', // Default weapon
    hp: 145,
    maxHp: 145,
    mp: 50,
    maxMp: 50,
    potions: 2,
    dodgePrepared: false
  };

  recalculateStats(hero);
  hero.hp = hero.maxHp;
  hero.mp = hero.maxMp;

  const firstTrial = TRIALS[0];
  const enemy = {
    id: firstTrial.id,
    name: firstTrial.name,
    hp: firstTrial.hp,
    maxHp: firstTrial.maxHp,
    atk: firstTrial.atk,
    def: firstTrial.def
  };

  return {
    seed,
    rngState: rngVal,
    trial: 1,
    maxTrials: 4,
    hero,
    enemy,
    turnCount: 0,
    score: 0,
    done: false,
    victory: false,
    combatLog: ['Destiny Crucible activated: Avatar forged!']
  };
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const h = state.hero;

  // Customization: Stat allocation
  if (h.statPoints > 0) {
    actions.push('allocate:str');
    actions.push('allocate:dex');
    actions.push('allocate:int');
    actions.push('allocate:con');
  }

  // Trait options
  const traits = ['ironborn', 'shadowblade', 'spellweaver', 'guardian'];
  for (let i = 0; i < traits.length; i++) {
    if (h.trait !== traits[i]) {
      actions.push(`choose_trait:${traits[i]}`);
    }
  }

  // Weapon disciplines
  const weapons = ['greatsword', 'daggers', 'staff'];
  for (let i = 0; i < weapons.length; i++) {
    if (h.weapon !== weapons[i]) {
      actions.push(`choose_weapon:${weapons[i]}`);
    }
  }

  // Combat actions
  actions.push('attack');
  if (h.mp >= 15) {
    actions.push('spell');
  }
  if (!h.dodgePrepared) {
    actions.push('dodge');
  }
  if (h.potions > 0 && h.hp < h.maxHp) {
    actions.push('potion');
  }

  return actions;
}

function checkOutcome(state) {
  if (state.hero.hp <= 0) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! The avatar shattered under the trial burden.');
    return;
  }

  if (state.enemy.hp <= 0) {
    state.score += 250;
    if (state.trial < state.maxTrials) {
      state.trial++;
      const nextT = TRIALS[state.trial - 1];
      state.enemy = {
        id: nextT.id,
        name: nextT.name,
        hp: nextT.hp,
        maxHp: nextT.maxHp,
        atk: nextT.atk,
        def: nextT.def
      };

      // Victory rewards: Stat points & heal
      state.hero.statPoints += 3;
      state.hero.hp = state.hero.maxHp;
      state.hero.mp = state.hero.maxMp;
      state.hero.potions = Math.min(3, state.hero.potions + 1);
      state.combatLog.push(`Trial ${state.trial - 1} cleared! Gained +3 Stat Points. Facing ${state.enemy.name}!`);
    } else {
      // Victory over Doppelgänger
      state.done = true;
      state.victory = true;
      state.score += 1000 + Math.max(0, 200 - state.turnCount * 4);
      state.combatLog.push('VICTORY! The Mirror Doppelgänger shattered. True Avatar of Destiny Ascends!');
    }
    return;
  }

  if (state.turnCount >= MAX_TURNS) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Destiny slipped away: turn limit exceeded.');
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

  let isCombatAction = false;

  if (action.startsWith('allocate:')) {
    const stat = action.slice(9);
    h[stat]++;
    h.statPoints--;
    recalculateStats(h);
    state.score += 30;
    reward += 0.02;
    state.combatLog.push(`Allocated +1 to ${stat.toUpperCase()}!`);
  } else if (action.startsWith('choose_trait:')) {
    const t = action.slice(13);
    h.trait = t;
    recalculateStats(h);
    state.score += 40;
    reward += 0.02;
    state.combatLog.push(`Embraced background trait: ${t.toUpperCase()}!`);
  } else if (action.startsWith('choose_weapon:')) {
    const w = action.slice(14);
    h.weapon = w;
    recalculateStats(h);
    state.score += 40;
    reward += 0.02;
    state.combatLog.push(`Equipped weapon discipline: ${w.toUpperCase()}!`);
  } else if (action === 'attack') {
    isCombatAction = true;
    const isCrit = nextRng(state) < h.critChance;
    let baseDmg = Math.max(5, h.atk - e.def);

    // Daggers multi-stab effect
    if (h.weapon === 'daggers') {
      baseDmg = Math.round(baseDmg * 1.25);
    }

    const dmg = isCrit ? Math.round(baseDmg * 1.7) : baseDmg;
    e.hp = Math.max(0, e.hp - dmg);
    state.score += dmg * 2;
    reward += 0.04;
    state.combatLog.push(`Weapon Strike hit ${e.name} for ${dmg} DMG${isCrit ? ' [CRITICAL!]' : ''}!`);
  } else if (action === 'spell') {
    isCombatAction = true;
    h.mp -= 15;
    // Magic bypasses 50% defense
    const effDef = Math.floor(e.def / 2);
    const dmg = Math.max(12, h.spellAtk - effDef);
    e.hp = Math.max(0, e.hp - dmg);
    state.score += dmg * 3;
    reward += 0.06;
    state.combatLog.push(`Arcane Cataclysm scorched ${e.name} for ${dmg} Spell DMG!`);
  } else if (action === 'dodge') {
    isCombatAction = true;
    h.dodgePrepared = true;
    h.mp = Math.min(h.maxMp, h.mp + 6);
    state.combatLog.push('Took an evasive posture (+50% Dodge Evasion)!');
  } else if (action === 'potion') {
    isCombatAction = true;
    h.potions--;
    const healAmt = 35 + h.con * 2;
    h.hp = Math.min(h.maxHp, h.hp + healAmt);
    state.combatLog.push(`Consumed Elixir (+${healAmt} HP).`);
  }

  // Enemy counter-attacks if combat action taken and enemy survives
  if (isCombatAction && e.hp > 0) {
    let evades = false;
    const effectiveDodge = h.dodgeChance + (h.dodgePrepared ? 0.50 : 0.0);
    h.dodgePrepared = false; // reset after turn

    if (nextRng(state) < effectiveDodge) {
      evades = true;
    }

    if (evades) {
      state.combatLog.push(`EVADED! You swiftly dodged ${e.name}'s attack!`);
      reward += 0.03;
    } else {
      const eDmg = Math.max(3, e.atk - h.def);
      h.hp = Math.max(0, h.hp - eDmg);
      state.combatLog.push(`${e.name} retaliated for ${eDmg} DMG!`);
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
