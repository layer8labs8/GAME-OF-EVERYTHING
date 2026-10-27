// Pure deterministic simulation logic for 0092-real-time-strategy (Iron Siege RTS)

const MAX_TICKS = 150;
const BASE_MAX_HP = 500;
const MAX_WORKERS = 6;
const WORKER_COST = 50;
const BARRACKS_COST = 100;
const FACTORY_COST = 150;
const TURRET_COST = 75;
const MARINE_COST = 50;
const TANK_COST = 100;

const MARINE_HP = 40;
const MARINE_DPS = 8;
const TANK_HP = 90;
const TANK_DPS = 20;
const TURRET_DPS = 15;

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
    player: {
      coreHp: BASE_MAX_HP,
      minerals: 100,
      workers: 2,
      barracks: 0,
      factory: 0,
      turrets: 0,
      marines: 0,
      tanks: 0,
      marineHpPool: 0,
      tankHpPool: 0,
      armyPosition: 0 // 0: Base, 1: Midfield Ridge, 2: Enemy Base
    },
    enemy: {
      coreHp: BASE_MAX_HP,
      minerals: 100,
      workers: 2,
      barracks: 0,
      factory: 0,
      turrets: 0,
      marines: 0,
      tanks: 0,
      marineHpPool: 0,
      tankHpPool: 0,
      armyPosition: 2 // 2: Base, 1: Midfield Ridge, 0: Player Base
    },
    history: ['Command Core online. Deploy harvesters and construct barracks.'],
    winner: null,
    result: null,
    done: false
  };
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const p = state.player;

  // 1. Economic orders
  if (p.minerals >= WORKER_COST && p.workers < MAX_WORKERS) {
    actions.push('train_worker');
  }

  // 2. Construction orders
  if (p.minerals >= BARRACKS_COST && p.barracks < 2) {
    actions.push('build_barracks');
  }
  if (p.minerals >= FACTORY_COST && p.barracks >= 1 && p.factory < 2) {
    actions.push('build_factory');
  }
  if (p.minerals >= TURRET_COST && p.turrets < 3) {
    actions.push('build_turret');
  }

  // 3. Unit production orders
  if (p.minerals >= MARINE_COST && p.barracks >= 1) {
    actions.push('train_marine');
  }
  if (p.minerals >= TANK_COST && p.factory >= 1) {
    actions.push('train_tank');
  }

  // 4. Tactical maneuvers
  if ((p.marines > 0 || p.tanks > 0) && p.armyPosition < 2) {
    actions.push('order_advance');
  }
  if ((p.marines > 0 || p.tanks > 0) && p.armyPosition > 0) {
    actions.push('order_retreat');
  }

  // 5. Standard simulation tick pass
  actions.push('tick');

  return actions;
}

function applyDamageToArmy(faction, incomingDmg) {
  let remDmg = incomingDmg;

  // Marines take damage first
  while (remDmg > 0 && faction.marines > 0) {
    if (faction.marineHpPool <= remDmg) {
      remDmg -= faction.marineHpPool;
      faction.marines -= 1;
      faction.marineHpPool = faction.marines > 0 ? MARINE_HP : 0;
    } else {
      faction.marineHpPool -= remDmg;
      remDmg = 0;
    }
  }

  // Tanks absorb remaining damage
  while (remDmg > 0 && faction.tanks > 0) {
    if (faction.tankHpPool <= remDmg) {
      remDmg -= faction.tankHpPool;
      faction.tanks -= 1;
      faction.tankHpPool = faction.tanks > 0 ? TANK_HP : 0;
    } else {
      faction.tankHpPool -= remDmg;
      remDmg = 0;
    }
  }

  return remDmg; // Unabsorbed damage (hits base core if applicable)
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
  const p = state.player;
  const e = state.enemy;

  // Apply player chosen action
  if (action === 'train_worker') {
    p.minerals -= WORKER_COST;
    p.workers += 1;
    reward = 2;
    state.history.push(`Harvester deployed. Mineral income increased.`);
  } else if (action === 'build_barracks') {
    p.minerals -= BARRACKS_COST;
    p.barracks += 1;
    reward = 4;
    state.history.push(`Barracks constructed. Marine training unlocked.`);
  } else if (action === 'build_factory') {
    p.minerals -= FACTORY_COST;
    p.factory += 1;
    reward = 6;
    state.history.push(`Heavy Factory online. Siege Tank assembly unlocked.`);
  } else if (action === 'build_turret') {
    p.minerals -= TURRET_COST;
    p.turrets += 1;
    reward = 3;
    state.history.push(`Perimeter defense turret operational.`);
  } else if (action === 'train_marine') {
    p.minerals -= MARINE_COST;
    p.marines += 1;
    if (p.marineHpPool === 0) p.marineHpPool = MARINE_HP;
    reward = 3;
    state.history.push(`Marine deployed to vanguard.`);
  } else if (action === 'train_tank') {
    p.minerals -= TANK_COST;
    p.tanks += 1;
    if (p.tankHpPool === 0) p.tankHpPool = TANK_HP;
    reward = 6;
    state.history.push(`Siege Tank rolled off the assembly line.`);
  } else if (action === 'order_advance') {
    p.armyPosition = Math.min(2, p.armyPosition + 1);
    reward = 1;
    state.history.push(`Strike force advanced to position ${p.armyPosition}.`);
  } else if (action === 'order_retreat') {
    p.armyPosition = Math.max(0, p.armyPosition - 1);
    reward = 0;
    state.history.push(`Strike force fell back to position ${p.armyPosition}.`);
  }

  // --- SIMULATION TICK CYCLE ---
  // 1. Mineral Harvesting
  p.minerals += p.workers * 3;
  e.minerals += e.workers * 3;

  // 2. Enemy AI decision
  runEnemyAiRts(state);

  // 3. Combat resolution
  const prevEnemyMarines = e.marines;
  const prevEnemyTanks = e.tanks;

  resolveBattlefieldCollisions(state);

  if (e.marines < prevEnemyMarines) reward += (prevEnemyMarines - e.marines) * 5;
  if (e.tanks < prevEnemyTanks) reward += (prevEnemyTanks - e.tanks) * 12;

  // 4. Base destruction checks
  if (e.coreHp <= 0) {
    state.done = true;
    state.winner = 'player';
    state.result = 'victory';
    reward = 100;
    state.history.push('Enemy Command Core obliterated! Sector secured.');
  } else if (p.coreHp <= 0) {
    state.done = true;
    state.winner = 'enemy';
    state.result = 'defeat';
    reward = -50;
    state.history.push('Our Command Core has been destroyed. Mission failed.');
  }

  // 5. Tick advancement & timeout
  if (!state.done) {
    state.tick += 1;
    if (state.tick > state.maxTicks) {
      evaluateTimeoutConclusion(state);
      if (state.winner === 'player') reward = 80;
      else reward = -40;
    }
  }

  return { reward, done: state.done };
}

function resolveBattlefieldCollisions(state) {
  const p = state.player;
  const e = state.enemy;

  const playerArmyTotal = p.marines + p.tanks;
  const enemyArmyTotal = e.marines + e.tanks;

  let playerDPS = p.marines * MARINE_DPS + p.tanks * TANK_DPS;
  let enemyDPS = e.marines * MARINE_DPS + e.tanks * TANK_DPS;

  // Turret contributions
  if (e.armyPosition === 0 && p.turrets > 0) {
    // Enemy attacking player base
    playerDPS += p.turrets * TURRET_DPS;
  }
  if (p.armyPosition === 2 && e.turrets > 0) {
    // Player attacking enemy base
    enemyDPS += e.turrets * TURRET_DPS;
  }

  // A. Mid-field or Base clashes: Armies meet at the same sector
  if (p.armyPosition === e.armyPosition && playerArmyTotal > 0 && enemyArmyTotal > 0) {
    applyDamageToArmy(p, enemyDPS);
    applyDamageToArmy(e, playerDPS);
  }

  // B. Player siege on Enemy Base (Position 2)
  if (p.armyPosition === 2) {
    if (e.marines === 0 && e.tanks === 0) {
      // Direct core bombardment
      const siegeDmg = p.marines * MARINE_DPS + p.tanks * TANK_DPS;
      e.coreHp = Math.max(0, e.coreHp - siegeDmg);
      // Enemy turrets still fire back at siege units
      if (e.turrets > 0) {
        applyDamageToArmy(p, e.turrets * TURRET_DPS);
      }
    }
  }

  // C. Enemy siege on Player Base (Position 0)
  if (e.armyPosition === 0) {
    if (p.marines === 0 && p.tanks === 0) {
      // Direct core bombardment
      const siegeDmg = e.marines * MARINE_DPS + e.tanks * TANK_DPS;
      p.coreHp = Math.max(0, p.coreHp - siegeDmg);
      // Player turrets fire back at attackers
      if (p.turrets > 0) {
        applyDamageToArmy(e, p.turrets * TURRET_DPS);
      }
    }
  }
}

function runEnemyAiRts(state) {
  const e = state.enemy;

  // Production macro
  if (e.minerals >= FACTORY_COST && e.barracks >= 1 && e.factory === 0) {
    e.minerals -= FACTORY_COST;
    e.factory += 1;
  } else if (e.minerals >= BARRACKS_COST && e.barracks === 0) {
    e.minerals -= BARRACKS_COST;
    e.barracks += 1;
  } else if (e.minerals >= WORKER_COST && e.workers < 4) {
    e.minerals -= WORKER_COST;
    e.workers += 1;
  } else if (e.factory >= 1 && e.minerals >= TANK_COST) {
    e.minerals -= TANK_COST;
    e.tanks += 1;
    if (e.tankHpPool === 0) e.tankHpPool = TANK_HP;
  } else if (e.barracks >= 1 && e.minerals >= MARINE_COST) {
    e.minerals -= MARINE_COST;
    e.marines += 1;
    if (e.marineHpPool === 0) e.marineHpPool = MARINE_HP;
  }

  // Strategic maneuvers
  const enemyPower = e.marines * 1 + e.tanks * 3;
  if (enemyPower >= 3) {
    // Advance forward
    if (e.armyPosition > 0) {
      e.armyPosition -= 1;
    }
  } else if (enemyPower === 0) {
    // Regroup at base
    e.armyPosition = 2;
  }
}

function evaluateTimeoutConclusion(state) {
  state.done = true;
  const pScore = state.player.coreHp + (state.player.marines * 25) + (state.player.tanks * 60);
  const eScore = state.enemy.coreHp + (state.enemy.marines * 25) + (state.enemy.tanks * 60);

  if (pScore >= eScore) {
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Time expired. Strategic superiority achieved.');
  } else {
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Time expired. Enemy forces hold regional dominance.');
  }
}

function isOver(state) {
  return state.done;
}

function score(state) {
  const p = state.player;
  const e = state.enemy;

  let s = (p.coreHp - (BASE_MAX_HP - e.coreHp) * 0.5) + (p.workers * 10) + (p.marines * 20) + (p.tanks * 45) + (p.turrets * 15);
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
    BASE_MAX_HP,
    WORKER_COST,
    BARRACKS_COST,
    FACTORY_COST,
    TURRET_COST,
    MARINE_COST,
    TANK_COST
  };
}
