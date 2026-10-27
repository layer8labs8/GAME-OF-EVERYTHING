// Logic for 0115-party-based-rpg: Guild Expedition: Darkest Depths
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const MAX_TURNS = 140;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

function createRoomEnemies(roomNumber) {
  if (roomNumber === 1) {
    return [
      { id: 'e1', name: 'Bone Soldier', hp: 45, maxHp: 45, atk: 14, stressAtk: 5, def: 4 },
      { id: 'e2', name: 'Bone Arbalest', hp: 35, maxHp: 35, atk: 16, stressAtk: 8, def: 2 }
    ];
  } else if (roomNumber === 2) {
    return [
      { id: 'e1', name: 'Cultist Brawler', hp: 50, maxHp: 50, atk: 16, stressAtk: 8, def: 5 },
      { id: 'e2', name: 'Mad Prophet', hp: 42, maxHp: 42, atk: 10, stressAtk: 24, def: 2 }
    ];
  } else if (roomNumber === 3) {
    return [
      { id: 'e1', name: 'Abyssal Brute', hp: 75, maxHp: 75, atk: 22, stressAtk: 12, def: 6 },
      { id: 'e2', name: 'Eldritch Witch', hp: 50, maxHp: 50, atk: 14, stressAtk: 28, def: 3 }
    ];
  } else {
    // Room 4: Boss Room
    return [
      { id: 'e1', name: 'Dread Wraith', hp: 60, maxHp: 60, atk: 18, stressAtk: 15, def: 4 },
      { id: 'e2', name: 'Ancient Lich King', hp: 150, maxHp: 150, atk: 26, stressAtk: 22, def: 8 }
    ];
  }
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 314159265;

  const heroes = [
    {
      id: 'h1',
      name: 'Crusader',
      role: 'crusader',
      rank: 0,
      hp: 100,
      maxHp: 100,
      stress: 0,
      atk: 26,
      def: 10,
      acted: false,
      afflicted: false,
      virtuous: false,
      deathsDoor: false,
      guarded: false
    },
    {
      id: 'h2',
      name: 'Highwayman',
      role: 'highwayman',
      rank: 1,
      hp: 70,
      maxHp: 70,
      stress: 0,
      atk: 24,
      def: 4,
      acted: false,
      afflicted: false,
      virtuous: false,
      deathsDoor: false,
      guarded: false
    },
    {
      id: 'h3',
      name: 'Vestal',
      role: 'vestal',
      rank: 2,
      hp: 60,
      maxHp: 60,
      stress: 0,
      atk: 18,
      def: 3,
      acted: false,
      afflicted: false,
      virtuous: false,
      deathsDoor: false,
      guarded: false
    },
    {
      id: 'h4',
      name: 'Occultist',
      role: 'occultist',
      rank: 3,
      hp: 55,
      maxHp: 55,
      stress: 0,
      atk: 28,
      def: 2,
      acted: false,
      afflicted: false,
      virtuous: false,
      deathsDoor: false,
      guarded: false
    }
  ];

  return {
    seed,
    rngState: rngVal,
    room: 1,
    maxRooms: 4,
    heroes,
    enemies: createRoomEnemies(1),
    activeHeroIndex: 0,
    round: 1,
    turnCount: 0,
    score: 0,
    done: false,
    victory: false,
    combatLog: ['Guild expedition entered Room 1 of the Accursed Crypts.']
  };
}

function getActiveHero(state) {
  // Find currently active hero or first unacted alive hero
  const cur = state.heroes[state.activeHeroIndex];
  if (cur && cur.hp > 0 && !cur.acted) {
    return cur;
  }
  for (let i = 0; i < state.heroes.length; i++) {
    const h = state.heroes[i];
    if (h.hp > 0 && !h.acted) {
      return h;
    }
  }
  return null;
}

function legalActions(state) {
  if (state.done) return [];

  const hero = getActiveHero(state);
  if (!hero) return [];

  const actions = [];
  const aliveEnemies = [];
  for (let i = 0; i < state.enemies.length; i++) {
    if (state.enemies[i].hp > 0) {
      aliveEnemies.push(i); // enemy rank index
    }
  }

  if (hero.role === 'crusader') {
    // Smite: can target enemy rank 0 or 1
    for (let i = 0; i < aliveEnemies.length; i++) {
      const eRank = aliveEnemies[i];
      if (eRank <= 1) {
        actions.push(`skill:smite:${eRank}`);
      }
    }
    // Holy Shield: guard an ally
    for (let i = 0; i < state.heroes.length; i++) {
      const ally = state.heroes[i];
      if (ally.hp > 0) {
        actions.push(`guard:${i}`);
      }
    }
  } else if (hero.role === 'highwayman') {
    // Wicked Slice: targets enemy rank 0 or 1
    for (let i = 0; i < aliveEnemies.length; i++) {
      const eRank = aliveEnemies[i];
      if (eRank <= 1) {
        actions.push(`skill:wicked_slice:${eRank}`);
      }
    }
    // Pistol Shot: targets any alive enemy rank
    for (let i = 0; i < aliveEnemies.length; i++) {
      actions.push(`skill:pistol_shot:${aliveEnemies[i]}`);
    }
  } else if (hero.role === 'vestal') {
    // Divine Grace: heal single ally
    for (let i = 0; i < state.heroes.length; i++) {
      const ally = state.heroes[i];
      if (ally.hp > 0 && ally.hp < ally.maxHp) {
        actions.push(`heal:divine_grace:${i}`);
      }
    }
    // Sanctuary: stress reduction for the whole party
    actions.push('skill:sanctuary');
    // Judgement: magical strike on enemy rank 0 or 1
    for (let i = 0; i < aliveEnemies.length; i++) {
      const eRank = aliveEnemies[i];
      if (eRank <= 1) {
        actions.push(`skill:judgement:${eRank}`);
      }
    }
  } else if (hero.role === 'occultist') {
    // Abyssal Artillery: targets enemy rank 1 or higher (backline)
    for (let i = 0; i < aliveEnemies.length; i++) {
      const eRank = aliveEnemies[i];
      if (eRank >= 1 || aliveEnemies.length === 1) {
        actions.push(`skill:abyssal_artillery:${eRank}`);
      }
    }
    // Wyrd Reconstruction: high heal with slight stress gamble
    for (let i = 0; i < state.heroes.length; i++) {
      const ally = state.heroes[i];
      if (ally.hp > 0 && ally.hp < ally.maxHp) {
        actions.push(`heal:wyrd:${i}`);
      }
    }
    // Curse of Weakness: debuff enemy
    for (let i = 0; i < aliveEnemies.length; i++) {
      actions.push(`curse:${aliveEnemies[i]}`);
    }
  }

  // Can always pass or steady oneself
  actions.push('pass');

  return actions;
}

function applyDamageToHero(state, hero, rawDmg, stressDmg) {
  const effectiveDef = hero.guarded ? hero.def + 8 : hero.def;
  const dmg = Math.max(3, rawDmg - effectiveDef);

  if (hero.hp > 0) {
    hero.hp = Math.max(0, hero.hp - dmg);
    if (hero.hp === 0) {
      hero.deathsDoor = true;
      state.combatLog.push(`⚠️ ${hero.name} has fallen to DEATH'S DOOR!`);
    }
  } else if (hero.deathsDoor) {
    // Death blow check: 50% death blow chance on lethal hit
    const roll = nextRng(state);
    if (roll < 0.5) {
      hero.deathsDoor = false;
      state.combatLog.push(`💀 ${hero.name} suffered a fatal blow and perished!`);
    } else {
      state.combatLog.push(`🛡️ ${hero.name} resisted the death blow!`);
    }
  }

  // Apply Stress
  if (stressDmg > 0 && hero.hp > 0) {
    hero.stress = Math.min(100, hero.stress + stressDmg);
    if (hero.stress >= 100 && !hero.afflicted && !hero.virtuous) {
      const virtueRoll = nextRng(state);
      if (virtueRoll < 0.3) {
        hero.virtuous = true;
        hero.stress = 0;
        state.combatLog.push(`🌟 HEROIC RESOLVE! ${hero.name} became COURAGEOUS!`);
      } else {
        hero.afflicted = true;
        state.combatLog.push(`💥 RESOLVE TESTED... ${hero.name} became AFFLICTED (Panic)!`);
      }
    }
  }

  return dmg;
}

function executeEnemyPhase(state) {
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.hp <= 0) continue;

    // Pick target: front ranks preferred
    let target = null;
    for (let j = 0; j < state.heroes.length; j++) {
      if (state.heroes[j].hp > 0) {
        target = state.heroes[j];
        break;
      }
    }

    if (!target) break;

    const dmg = applyDamageToHero(state, target, e.atk, e.stressAtk);
    state.combatLog.push(`${e.name} struck ${target.name} for ${dmg} DMG (+${e.stressAtk} Stress)!`);
  }

  // Round wrap up
  state.round++;
  for (let i = 0; i < state.heroes.length; i++) {
    const h = state.heroes[i];
    h.acted = false;
    h.guarded = false;
  }

  // Point to first alive hero
  const nextIdx = state.heroes.findIndex(h => h.hp > 0);
  state.activeHeroIndex = nextIdx >= 0 ? nextIdx : 0;
}

function checkPartyOutcome(state) {
  // Check room clear
  const roomClear = state.enemies.every(e => e.hp <= 0);
  if (roomClear) {
    state.score += 250;
    if (state.room < state.maxRooms) {
      state.room++;
      state.enemies = createRoomEnemies(state.room);
      state.combatLog.push(`Room cleared! Guild party advances to Room ${state.room} of ${state.maxRooms}.`);

      // Camp ration healing between rooms
      for (let i = 0; i < state.heroes.length; i++) {
        const h = state.heroes[i];
        if (h.hp > 0) {
          h.hp = Math.min(h.maxHp, h.hp + 20);
          h.stress = Math.max(0, h.stress - 20);
          h.deathsDoor = false;
        }
      }
      return;
    } else {
      // Dungeon Conquered!
      state.done = true;
      state.victory = true;
      state.score += 800 + Math.max(0, 150 - state.turnCount * 5);
      state.combatLog.push('VICTORY! The Lich King has been banished and the crypt cleansed!');
      return;
    }
  }

  // Check party wipeout
  const allDead = state.heroes.every(h => h.hp <= 0);
  if (allDead) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! The entire guild expedition was lost to the darkness.');
    return;
  }

  if (state.turnCount >= MAX_TURNS) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Party succumbs to starvation and exhaustion.');
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

  const hero = getActiveHero(state);
  if (!hero) {
    throw new Error('No active hero available');
  }

  state.turnCount++;
  let reward = 0.0;

  if (action.startsWith('skill:smite:')) {
    const eRank = Number(action.split(':')[2]);
    const target = state.enemies[eRank];
    const dmg = Math.max(8, hero.atk - target.def + 4);
    target.hp = Math.max(0, target.hp - dmg);
    hero.acted = true;
    state.score += dmg * 2;
    reward += 0.05;
    state.combatLog.push(`${hero.name} delivered righteous Smite to ${target.name} for ${dmg} DMG!`);

    if (target.hp === 0) {
      state.score += 100;
      reward += 0.15;
      state.combatLog.push(`${target.name} was purified!`);
    }
  } else if (action.startsWith('skill:wicked_slice:')) {
    const eRank = Number(action.split(':')[2]);
    const target = state.enemies[eRank];
    const dmg = Math.max(7, hero.atk - target.def + 3);
    target.hp = Math.max(0, target.hp - dmg);
    hero.acted = true;
    state.score += dmg * 2;
    reward += 0.05;
    state.combatLog.push(`${hero.name} executed Wicked Slice on ${target.name} for ${dmg} DMG!`);

    if (target.hp === 0) {
      state.score += 100;
      reward += 0.15;
      state.combatLog.push(`${target.name} collapsed in blood!`);
    }
  } else if (action.startsWith('skill:pistol_shot:')) {
    const eRank = Number(action.split(':')[2]);
    const target = state.enemies[eRank];
    const dmg = Math.max(6, Math.round(hero.atk * 1.1) - target.def);
    target.hp = Math.max(0, target.hp - dmg);
    hero.acted = true;
    state.score += dmg * 2;
    reward += 0.05;
    state.combatLog.push(`${hero.name} sniped ${target.name} with Pistol Shot for ${dmg} DMG!`);

    if (target.hp === 0) {
      state.score += 100;
      reward += 0.15;
      state.combatLog.push(`${target.name} was slain!`);
    }
  } else if (action.startsWith('skill:judgement:')) {
    const eRank = Number(action.split(':')[2]);
    const target = state.enemies[eRank];
    const dmg = Math.max(5, hero.atk - target.def + 2);
    target.hp = Math.max(0, target.hp - dmg);
    // Vestal self heals for a small amount on judgement
    hero.hp = Math.min(hero.maxHp, hero.hp + 6);
    hero.acted = true;
    state.score += dmg * 2;
    reward += 0.05;
    state.combatLog.push(`${hero.name} cast Judgement on ${target.name} for ${dmg} DMG (restores 6 HP)!`);

    if (target.hp === 0) {
      state.score += 100;
      reward += 0.15;
      state.combatLog.push(`${target.name} was purged!`);
    }
  } else if (action.startsWith('skill:abyssal_artillery:')) {
    const eRank = Number(action.split(':')[2]);
    const target = state.enemies[eRank];
    const dmg = Math.max(10, Math.round(hero.atk * 1.25) - target.def);
    target.hp = Math.max(0, target.hp - dmg);
    hero.acted = true;
    state.score += dmg * 3;
    reward += 0.08;
    state.combatLog.push(`${hero.name} bombarded ${target.name} with Abyssal Artillery for ${dmg} DMG!`);

    if (target.hp === 0) {
      state.score += 100;
      reward += 0.15;
      state.combatLog.push(`${target.name} disintegrated into the void!`);
    }
  } else if (action.startsWith('heal:divine_grace:')) {
    const aIdx = Number(action.split(':')[2]);
    const ally = state.heroes[aIdx];
    ally.hp = Math.min(ally.maxHp, ally.hp + 28);
    ally.deathsDoor = false;
    hero.acted = true;
    reward += 0.04;
    state.combatLog.push(`${hero.name} bestowed Divine Grace upon ${ally.name} (+28 HP)!`);
  } else if (action === 'skill:sanctuary') {
    hero.acted = true;
    for (let i = 0; i < state.heroes.length; i++) {
      const h = state.heroes[i];
      if (h.hp > 0) {
        h.stress = Math.max(0, h.stress - 15);
      }
    }
    state.combatLog.push(`${hero.name} chanted Sanctuary! Party stress reduced by 15.`);
  } else if (action.startsWith('heal:wyrd:')) {
    const aIdx = Number(action.split(':')[2]);
    const ally = state.heroes[aIdx];
    ally.hp = Math.min(ally.maxHp, ally.hp + 38);
    ally.deathsDoor = false;
    ally.stress = Math.min(100, ally.stress + 6); // slight occult stress
    hero.acted = true;
    reward += 0.04;
    state.combatLog.push(`${hero.name} performed Wyrd Reconstruction on ${ally.name} (+38 HP, +6 Stress)!`);
  } else if (action.startsWith('guard:')) {
    const aIdx = Number(action.split(':')[1]);
    const ally = state.heroes[aIdx];
    ally.guarded = true;
    hero.acted = true;
    state.combatLog.push(`${hero.name} raised Holy Shield to guard ${ally.name}!`);
  } else if (action.startsWith('curse:')) {
    const eRank = Number(action.split(':')[1]);
    const target = state.enemies[eRank];
    target.atk = Math.max(5, target.atk - 6);
    target.def = Math.max(0, target.def - 3);
    hero.acted = true;
    state.combatLog.push(`${hero.name} afflicted ${target.name} with Curse of Weakness (-6 ATK, -3 DEF)!`);
  } else if (action === 'pass') {
    hero.acted = true;
    state.combatLog.push(`${hero.name} steadied their resolve.`);
  }

  // Outcome check
  checkPartyOutcome(state);
  if (state.done) {
    return { reward: state.victory ? 1.0 : 0.0, done: true };
  }

  // Turn management: Check if any alive hero still needs to act
  const nextUnacted = state.heroes.findIndex(h => h.hp > 0 && !h.acted);
  if (nextUnacted >= 0) {
    state.activeHeroIndex = nextUnacted;
  } else {
    // All heroes acted: Run Enemy Phase
    executeEnemyPhase(state);
    checkPartyOutcome(state);
    if (state.done) {
      return { reward: state.victory ? 1.0 : 0.0, done: true };
    }
  }

  return { reward, done: state.done };
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
