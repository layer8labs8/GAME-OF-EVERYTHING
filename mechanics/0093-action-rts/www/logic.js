// Pure deterministic simulation logic for 0093-action-rts (Battle Commander)

const MAX_TICKS = 150;
const HERO_MAX_HP = 200;
const HERO_MAX_MANA = 100;
const TOWER_MAX_HP = 250;
const CORE_MAX_HP = 400;
const MINION_HP = 40;
const MINION_ATTACK = 10;
const TOWER_ATTACK = 20;

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 12345) {
  const numSeed = typeof seed === 'number' ? seed : 12345;

  return {
    seed: numSeed,
    rngStep: 0,
    tick: 1,
    maxTicks: MAX_TICKS,
    nextMinionId: 1,
    playerHero: {
      hp: HERO_MAX_HP,
      maxHp: HERO_MAX_HP,
      mana: HERO_MAX_MANA,
      maxMana: HERO_MAX_MANA,
      pos: 1,
      alive: true,
      respawnTimer: 0
    },
    enemyHero: {
      hp: HERO_MAX_HP,
      maxHp: HERO_MAX_HP,
      mana: HERO_MAX_MANA,
      maxMana: HERO_MAX_MANA,
      pos: 5,
      alive: true,
      respawnTimer: 0
    },
    playerTower: { pos: 1, hp: TOWER_MAX_HP, maxHp: TOWER_MAX_HP, alive: true },
    enemyTower: { pos: 5, hp: TOWER_MAX_HP, maxHp: TOWER_MAX_HP, alive: true },
    playerCore: { pos: 0, hp: CORE_MAX_HP, maxHp: CORE_MAX_HP },
    enemyCore: { pos: 6, hp: CORE_MAX_HP, maxHp: CORE_MAX_HP },
    minions: [
      { id: 1, team: 'player', pos: 1, hp: MINION_HP, maxHp: MINION_HP, attack: MINION_ATTACK },
      { id: 2, team: 'player', pos: 1, hp: MINION_HP, maxHp: MINION_HP, attack: MINION_ATTACK },
      { id: 3, team: 'enemy', pos: 5, hp: MINION_HP, maxHp: MINION_HP, attack: MINION_ATTACK },
      { id: 4, team: 'enemy', pos: 5, hp: MINION_HP, maxHp: MINION_HP, attack: MINION_ATTACK }
    ],
    history: ['Champion summoned to the battle lane. Push with the minion wave.'],
    winner: null,
    result: null,
    done: false
  };
}

function getRngValue(state) {
  state.rngStep = (state.rngStep + 1) | 0;
  const rng = createRng(state.seed + state.rngStep);
  return rng();
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const hero = state.playerHero;

  if (hero.alive) {
    if (hero.pos > 0) actions.push('move_left');
    if (hero.pos < 6) actions.push('move_right');
    actions.push('hero_attack');

    if (hero.mana >= 30) {
      actions.push('ability_shockwave');
    }
    if (hero.mana >= 25) {
      actions.push('ability_rally');
    }
    actions.push('rest_mana');
  }

  // Pass / tick is always available
  actions.push('tick');

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
  const hero = state.playerHero;
  const enemy = state.enemyHero;

  // 1. Process Player Hero Action
  if (action === 'move_left') {
    hero.pos = Math.max(0, hero.pos - 1);
    reward = 1;
    state.history.push(`Champion pulled back to lane position ${hero.pos}.`);
  } else if (action === 'move_right') {
    hero.pos = Math.min(6, hero.pos + 1);
    reward = 2;
    state.history.push(`Champion advanced forward to lane position ${hero.pos}.`);
  } else if (action === 'hero_attack') {
    // Attack enemy minions or hero or structure at current sector
    const hit = executeHeroStrike(state, 'player', 25);
    reward += hit.reward;
  } else if (action === 'ability_shockwave') {
    hero.mana -= 30;
    const targets = state.minions.filter(m => m.team === 'enemy' && m.pos === hero.pos);
    targets.forEach(m => { m.hp -= 45; });
    if (enemy.alive && enemy.pos === hero.pos) {
      enemy.hp -= 45;
    }
    reward = 8;
    state.history.push(`Unleashed Shockwave blast across position ${hero.pos}!`);
  } else if (action === 'ability_rally') {
    hero.mana -= 25;
    const allies = state.minions.filter(m => m.team === 'player' && m.pos === hero.pos);
    allies.forEach(m => {
      m.hp = Math.min(m.maxHp + 20, m.hp + 20);
      m.attack += 5;
    });
    reward = 5;
    state.history.push(`Rallied friendly minion cadre with inspiring battle cry.`);
  } else if (action === 'rest_mana') {
    hero.mana = Math.min(hero.maxMana, hero.mana + 30);
    hero.hp = Math.min(hero.maxHp, hero.hp + 15);
    reward = 1;
    state.history.push(`Champion meditated, recovering Mana and Health.`);
  }

  // 2. Process Enemy AI Champion
  runEnemyHeroAi(state);

  // 3. Process Tower Defenses
  resolveTowerAttacks(state);

  // 4. Minion Wave Clashes & Movement
  resolveMinionCombatAndAdvance(state);

  // 5. Minion Wave Spawns
  if (state.tick % 4 === 0) {
    spawnCreepWave(state);
  }

  // 6. Handle Hero Respawns
  handleHeroRespawns(state);

  // 7. Check Objective & Core Destruction
  if (state.enemyTower.alive && state.enemyTower.hp <= 0) {
    state.enemyTower.alive = false;
    reward += 30;
    state.history.push('Enemy Citadel Tower collapsed!');
  }
  if (state.playerTower.alive && state.playerTower.hp <= 0) {
    state.playerTower.alive = false;
    reward -= 20;
    state.history.push('Our Citadel Tower was leveled!');
  }

  if (state.enemyCore.hp <= 0) {
    state.done = true;
    state.winner = 'player';
    state.result = 'victory';
    reward += 100;
    state.history.push('Victory! Enemy Ancient Base Core destroyed!');
  } else if (state.playerCore.hp <= 0) {
    state.done = true;
    state.winner = 'enemy';
    state.result = 'defeat';
    reward -= 50;
    state.history.push('Defeat! Our Ancient Base Core has fallen.');
  }

  // 8. Tick Advancement & Timeout
  if (!state.done) {
    state.tick += 1;
    if (state.tick > state.maxTicks) {
      evaluateTimeout(state);
      reward = state.winner === 'player' ? 60 : -30;
    }
  }

  return { reward, done: state.done };
}

function executeHeroStrike(state, faction, dmg) {
  const isPlayer = faction === 'player';
  const hero = isPlayer ? state.playerHero : state.enemyHero;
  const oppFaction = isPlayer ? 'enemy' : 'player';
  let reward = 0;

  // Priority 1: Opposing Hero in same sector
  const oppHero = isPlayer ? state.enemyHero : state.playerHero;
  if (oppHero.alive && oppHero.pos === hero.pos) {
    oppHero.hp -= dmg;
    if (oppHero.hp <= 0) {
      oppHero.alive = false;
      oppHero.respawnTimer = 3;
      reward += isPlayer ? 25 : 0;
      state.history.push(`${isPlayer ? 'Champion' : 'Shadow Warlock'} felled the opposing commander!`);
    } else {
      reward += isPlayer ? 4 : 0;
    }
    return { reward };
  }

  // Priority 2: Opposing Minions in sector
  const oppMinions = state.minions.filter(m => m.team === oppFaction && m.pos === hero.pos);
  if (oppMinions.length > 0) {
    oppMinions[0].hp -= dmg;
    reward += isPlayer ? 3 : 0;
    return { reward };
  }

  // Priority 3: Opposing Tower in sector
  if (isPlayer && state.enemyTower.alive && hero.pos === state.enemyTower.pos) {
    state.enemyTower.hp = Math.max(0, state.enemyTower.hp - dmg);
    reward += 8;
    return { reward };
  }
  if (!isPlayer && state.playerTower.alive && hero.pos === state.playerTower.pos) {
    state.playerTower.hp = Math.max(0, state.playerTower.hp - dmg);
    return { reward };
  }

  // Priority 4: Opposing Core in sector
  if (isPlayer && hero.pos === 6) {
    state.enemyCore.hp = Math.max(0, state.enemyCore.hp - dmg);
    reward += 15;
    return { reward };
  }
  if (!isPlayer && hero.pos === 0) {
    state.playerCore.hp = Math.max(0, state.playerCore.hp - dmg);
    return { reward };
  }

  return { reward };
}

function runEnemyHeroAi(state) {
  const e = state.enemyHero;
  if (!e.alive) return;

  // AI Decision logic
  if (e.hp < 60 && e.pos < 5) {
    // Retreat towards base
    e.pos += 1;
  } else if (e.mana >= 30 && state.minions.some(m => m.team === 'player' && m.pos === e.pos)) {
    // Cast shadow blast
    e.mana -= 30;
    state.minions.filter(m => m.team === 'player' && m.pos === e.pos).forEach(m => { m.hp -= 40; });
    if (state.playerHero.alive && state.playerHero.pos === e.pos) {
      state.playerHero.hp -= 40;
    }
  } else {
    // Attack or advance
    const targetsHere = state.minions.filter(m => m.team === 'player' && m.pos === e.pos);
    if (targetsHere.length > 0 || (state.playerHero.alive && state.playerHero.pos === e.pos)) {
      executeHeroStrike(state, 'enemy', 22);
    } else if (e.pos > 0) {
      e.pos -= 1; // Advance towards player base
    }
  }

  // Passive mana regeneration
  e.mana = Math.min(e.maxMana, e.mana + 5);
}

function resolveTowerAttacks(state) {
  // Player Tower at Pos 1
  if (state.playerTower.alive) {
    const invaders = state.minions.filter(m => m.team === 'enemy' && m.pos === 1);
    if (invaders.length > 0) {
      invaders[0].hp -= TOWER_ATTACK;
    } else if (state.enemyHero.alive && state.enemyHero.pos === 1) {
      state.enemyHero.hp -= TOWER_ATTACK;
    }
  }

  // Enemy Tower at Pos 5
  if (state.enemyTower.alive) {
    const invaders = state.minions.filter(m => m.team === 'player' && m.pos === 5);
    if (invaders.length > 0) {
      invaders[0].hp -= TOWER_ATTACK;
    } else if (state.playerHero.alive && state.playerHero.pos === 5) {
      state.playerHero.hp -= TOWER_ATTACK;
    }
  }
}

function resolveMinionCombatAndAdvance(state) {
  // 1. Minion combat at contested sectors
  const posHasClash = new Set();
  const posHasSiege = new Set();

  for (let pos = 0; pos <= 6; pos++) {
    const pMinions = state.minions.filter(m => m.team === 'player' && m.pos === pos);
    const eMinions = state.minions.filter(m => m.team === 'enemy' && m.pos === pos);

    if (pMinions.length > 0 && eMinions.length > 0) {
      posHasClash.add(pos);
      const pDmg = pMinions.reduce((sum, m) => sum + m.attack, 0);
      const eDmg = eMinions.reduce((sum, m) => sum + m.attack, 0);

      distributeDamageToMinions(eMinions, pDmg);
      distributeDamageToMinions(pMinions, eDmg);
    } else if (pMinions.length > 0) {
      if (pos === 5 && state.enemyTower.alive) {
        posHasSiege.add(pos);
        state.enemyTower.hp = Math.max(0, state.enemyTower.hp - pMinions.length * MINION_ATTACK);
      } else if (pos === 6) {
        posHasSiege.add(pos);
        state.enemyCore.hp = Math.max(0, state.enemyCore.hp - pMinions.length * MINION_ATTACK);
      }
    } else if (eMinions.length > 0) {
      if (pos === 1 && state.playerTower.alive) {
        posHasSiege.add(pos);
        state.playerTower.hp = Math.max(0, state.playerTower.hp - eMinions.length * MINION_ATTACK);
      } else if (pos === 0) {
        posHasSiege.add(pos);
        state.playerCore.hp = Math.max(0, state.playerCore.hp - eMinions.length * MINION_ATTACK);
      }
    }
  }

  // 2. Remove dead minions
  state.minions = state.minions.filter(m => m.hp > 0);

  // 3. Move surviving minions that are not clashing or sieging
  for (let i = 0; i < state.minions.length; i++) {
    const m = state.minions[i];
    if (posHasClash.has(m.pos) || posHasSiege.has(m.pos)) continue;

    if (m.team === 'player' && m.pos < 6) {
      m.pos += 1;
    } else if (m.team === 'enemy' && m.pos > 0) {
      m.pos -= 1;
    }
  }
}

function distributeDamageToMinions(minionList, dmg) {
  let rem = dmg;
  for (let i = 0; i < minionList.length && rem > 0; i++) {
    const take = Math.min(minionList[i].hp, rem);
    minionList[i].hp -= take;
    rem -= take;
  }
}

function spawnCreepWave(state) {
  state.nextMinionId = state.nextMinionId || 10;
  state.minions.push(
    { id: state.nextMinionId++, team: 'player', pos: 0, hp: MINION_HP, maxHp: MINION_HP, attack: MINION_ATTACK },
    { id: state.nextMinionId++, team: 'player', pos: 0, hp: MINION_HP, maxHp: MINION_HP, attack: MINION_ATTACK },
    { id: state.nextMinionId++, team: 'enemy', pos: 6, hp: MINION_HP, maxHp: MINION_HP, attack: MINION_ATTACK },
    { id: state.nextMinionId++, team: 'enemy', pos: 6, hp: MINION_HP, maxHp: MINION_HP, attack: MINION_ATTACK }
  );
}

function handleHeroRespawns(state) {
  if (!state.playerHero.alive) {
    state.playerHero.respawnTimer -= 1;
    if (state.playerHero.respawnTimer <= 0) {
      state.playerHero.alive = true;
      state.playerHero.hp = HERO_MAX_HP;
      state.playerHero.mana = HERO_MAX_MANA;
      state.playerHero.pos = 0;
      state.history.push('Champion resurrected at the fountain!');
    }
  }

  if (!state.enemyHero.alive) {
    state.enemyHero.respawnTimer -= 1;
    if (state.enemyHero.respawnTimer <= 0) {
      state.enemyHero.alive = true;
      state.enemyHero.hp = HERO_MAX_HP;
      state.enemyHero.mana = HERO_MAX_MANA;
      state.enemyHero.pos = 6;
    }
  }
}

function evaluateTimeout(state) {
  state.done = true;
  const pScore = state.playerCore.hp + (state.playerTower.alive ? state.playerTower.hp : 0);
  const eScore = state.enemyCore.hp + (state.enemyTower.alive ? state.enemyTower.hp : 0);

  if (pScore >= eScore) {
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Time expired. Superior lane fortification achieved!');
  } else {
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Time expired. Enemy holds lane dominance.');
  }
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let s = (state.playerCore.hp - state.enemyCore.hp) * 1.5;
  if (state.playerTower.alive) s += 100;
  if (!state.enemyTower.alive) s += 150;
  if (state.playerHero.alive) s += 50;
  if (state.winner === 'player') s += 500;
  s -= (state.tick - 1) * 2;

  return Math.max(0, Math.round(s));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_TICKS,
    HERO_MAX_HP,
    CORE_MAX_HP,
    TOWER_MAX_HP
  };
}
