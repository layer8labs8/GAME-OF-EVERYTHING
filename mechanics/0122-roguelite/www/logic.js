// Logic for 0122-roguelite: Nether Ascendance
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const MAX_TURNS = 200;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

const CHAMBERS = [
  { id: 1, name: 'Brimstone Ghoul', hp: 40, maxHp: 40, atk: 12, def: 2, essence: 25 },
  { id: 2, name: 'Tartarus Phalanx', hp: 65, maxHp: 65, atk: 18, def: 5, essence: 35 },
  { id: 3, name: 'Stygian Hydra', hp: 105, maxHp: 105, atk: 25, def: 7, essence: 50 },
  { id: 4, name: 'The Underworld Warden', hp: 175, maxHp: 175, atk: 34, def: 10, essence: 100 }
];

const UPGRADE_COSTS = {
  vitality: 25,
  strength: 30,
  defiance: 50,
  harvest: 20
};

function getHeroMaxHp(state) {
  return 80 + state.upgrades.vitality * 20;
}

function getHeroBaseAtk(state) {
  return 14 + state.upgrades.strength * 5;
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 777123456;

  const upgrades = {
    vitality: 0,
    strength: 0,
    defiance: 0,
    harvest: 0
  };

  const state = {
    seed,
    rngState: rngVal,
    location: 'sanctuary', // 'sanctuary' or 'run'
    essence: 30, // Starting persistent currency
    upgrades,
    runCount: 0,
    chamber: 1,
    maxChambers: 4,
    hero: {
      hp: 80,
      maxHp: 80,
      stamina: 40,
      maxStamina: 40,
      defianceCharges: 0,
      boons: [], // 'flame', 'lightning', 'frost'
      dodging: false
    },
    monster: null,
    boonPending: false,
    turnCount: 0,
    score: 0,
    done: false,
    victory: false,
    combatLog: ['Resting at the Stygian Sanctuary. Gathered Nether Essence awaits forging.']
  };

  return state;
}

function initializeRun(state) {
  state.location = 'run';
  state.runCount++;
  state.chamber = 1;
  state.boonPending = false;

  state.hero.maxHp = getHeroMaxHp(state);
  state.hero.hp = state.hero.maxHp;
  state.hero.stamina = state.hero.maxStamina;
  state.hero.defianceCharges = state.upgrades.defiance;
  state.hero.boons = [];
  state.hero.dodging = false;

  const firstE = CHAMBERS[0];
  state.monster = {
    id: firstE.id,
    name: firstE.name,
    hp: firstE.hp,
    maxHp: firstE.maxHp,
    atk: firstE.atk,
    def: firstE.def,
    essence: firstE.essence
  };

  state.combatLog.push(`Run #${state.runCount} launched! Entering Chamber 1: ${state.monster.name} emerges!`);
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  if (state.location === 'sanctuary') {
    actions.push('start_run');

    if (state.essence >= UPGRADE_COSTS.vitality && state.upgrades.vitality < 5) {
      actions.push('upgrade:vitality');
    }
    if (state.essence >= UPGRADE_COSTS.strength && state.upgrades.strength < 5) {
      actions.push('upgrade:strength');
    }
    if (state.essence >= UPGRADE_COSTS.defiance && state.upgrades.defiance < 2) {
      actions.push('upgrade:defiance');
    }
    if (state.essence >= UPGRADE_COSTS.harvest && state.upgrades.harvest < 3) {
      actions.push('upgrade:harvest');
    }
    return actions;
  }

  // Location === 'run'
  const m = state.monster;
  if (m && m.hp > 0) {
    actions.push('attack');
    if (state.hero.stamina >= 12) {
      actions.push('special');
    }
    if (!state.hero.dodging) {
      actions.push('dash');
    }
  } else if (state.boonPending) {
    actions.push('choose_boon:flame');
    actions.push('choose_boon:lightning');
    actions.push('choose_boon:frost');
  } else if (state.chamber < state.maxChambers) {
    actions.push('next_chamber');
  }

  return actions;
}

function handleMonsterDeath(state) {
  const m = state.monster;
  const harvestMult = 1.0 + state.upgrades.harvest * 0.25;
  const gainedEssence = Math.round(m.essence * harvestMult);
  state.essence += gainedEssence;
  state.score += 200 + gainedEssence;
  state.combatLog.push(`${m.name} dissolved into the Styx! +${gainedEssence} Nether Essence collected.`);

  if (state.chamber < state.maxChambers) {
    state.boonPending = true;
    state.combatLog.push('Olympian Boon materialized! Choose a divine enhancement.');
  } else {
    // Escaped the Underworld!
    state.done = true;
    state.victory = true;
    state.score += 1500 + Math.max(0, 300 - state.turnCount * 4);
    state.combatLog.push('VICTORY! The Underworld Warden has fallen. ESCAPED THE NETHER!');
  }
}

function handleHeroFatalDamage(state) {
  if (state.hero.defianceCharges > 0) {
    state.hero.defianceCharges--;
    state.hero.hp = Math.round(state.hero.maxHp * 0.5);
    state.combatLog.push(`DEATH DEFIANCE TRIGGERED! Resurrected with ${state.hero.hp} HP!`);
    return false;
  } else {
    // Run ends, return to Sanctuary with gathered essence
    state.location = 'sanctuary';
    state.combatLog.push('Fatal wound! The Styx claimed you. Returned to the Sanctuary with gathered Essence intact.');
    return true;
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

  if (action === 'start_run') {
    initializeRun(state);
    return { reward: 0.02, done: state.done };
  } else if (action.startsWith('upgrade:')) {
    const type = action.slice(8);
    const cost = UPGRADE_COSTS[type];
    state.essence -= cost;
    state.upgrades[type]++;
    state.score += 80;
    reward += 0.05;
    state.combatLog.push(`Mirror of Night forged: Upgraded ${type.toUpperCase()} to Rank ${state.upgrades[type]}!`);
    return { reward, done: state.done };
  }

  const h = state.hero;
  const m = state.monster;

  let isCombat = false;

  if (action === 'attack') {
    isCombat = true;
    const baseAtk = getHeroBaseAtk(state);
    let dmg = Math.max(4, baseAtk - m.def);

    if (h.boons.includes('flame')) {
      dmg += 6; // Lingering flame
    }
    if (h.boons.includes('lightning')) {
      dmg += 8; // Chain lightning strike
    }

    m.hp = Math.max(0, m.hp - dmg);
    state.score += dmg * 2;
    reward += 0.04;
    state.combatLog.push(`Blade strike hit ${m.name} for ${dmg} DMG!`);

    if (m.hp === 0) {
      handleMonsterDeath(state);
    }
  } else if (action === 'special') {
    isCombat = true;
    h.stamina -= 12;
    const baseAtk = getHeroBaseAtk(state);
    let dmg = Math.max(10, Math.round(baseAtk * 1.8) - m.def);

    if (h.boons.includes('flame')) dmg += 10;
    if (h.boons.includes('lightning')) dmg += 12;

    m.hp = Math.max(0, m.hp - dmg);
    state.score += dmg * 3;
    reward += 0.06;
    state.combatLog.push(`Bloodline Nova erupted on ${m.name} for ${dmg} DMG!`);

    if (m.hp === 0) {
      handleMonsterDeath(state);
    }
  } else if (action === 'dash') {
    isCombat = true;
    h.dodging = true;
    h.stamina = Math.min(h.maxStamina, h.stamina + 8);
    state.combatLog.push('Shadow Dashed into i-frames (+75% Evasion)!');
  } else if (action.startsWith('choose_boon:')) {
    const boon = action.slice(12);
    h.boons.push(boon);
    state.boonPending = false;
    state.score += 60;
    reward += 0.05;
    state.combatLog.push(`Accepted Boon of ${boon.toUpperCase()}!`);
  } else if (action === 'next_chamber') {
    state.chamber++;
    state.score += 150;
    reward += 0.1;

    const nextE = CHAMBERS[state.chamber - 1];
    state.monster = {
      id: nextE.id,
      name: nextE.name,
      hp: nextE.hp,
      maxHp: nextE.maxHp,
      atk: nextE.atk,
      def: nextE.def,
      essence: nextE.essence
    };

    h.stamina = h.maxStamina;
    h.hp = Math.min(h.maxHp, h.hp + 20); // Fountain sip
    state.combatLog.push(`Crossed gate into Chamber ${state.chamber}: ${state.monster.name} attacks!`);
    return { reward, done: state.done };
  }

  // Enemy Counter-Attack if alive
  if (isCombat && m && m.hp > 0) {
    let evaded = false;
    if (h.dodging) {
      evaded = nextRng(state) < 0.75;
      h.dodging = false;
    }

    if (evaded) {
      state.combatLog.push(`DASH EVADED! ${m.name}'s attack whistled through empty air!`);
      reward += 0.02;
    } else {
      let incomingAtk = m.atk;
      if (h.boons.includes('frost')) {
        incomingAtk = Math.max(4, incomingAtk - 6); // Frost chill weakens hit
      }
      const rawDmg = Math.max(3, incomingAtk - 2);
      h.hp = Math.max(0, h.hp - rawDmg);
      state.combatLog.push(`${m.name} struck back for ${rawDmg} DMG!`);

      if (h.hp === 0) {
        handleHeroFatalDamage(state);
      }
    }
  }

  // Turn limit check
  if (state.turnCount >= MAX_TURNS) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Turn limit expired across escape attempts.');
  }

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
