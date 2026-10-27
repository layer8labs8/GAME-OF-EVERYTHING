// Pure deterministic simulation logic for 0111-jrpg (Crystal Echoes)

const MAX_TURNS = 45;

const BATTLES = [
  {
    stage: 1,
    name: 'Glacial Caverns',
    enemies: [
      { id: 'e1', name: 'Frost Stalker', hp: 45, maxHp: 45, atk: 12, shields: 2, maxShields: 2, weakness: 'fire', staggered: false, alive: true },
      { id: 'e2', name: 'Flame Wisp', hp: 35, maxHp: 35, atk: 10, shields: 2, maxShields: 2, weakness: 'ice', staggered: false, alive: true }
    ]
  },
  {
    stage: 2,
    name: 'Thunder Peak',
    enemies: [
      { id: 'e3', name: 'Storm Wyvern', hp: 75, maxHp: 75, atk: 18, shields: 3, maxShields: 3, weakness: 'ice', staggered: false, alive: true },
      { id: 'e4', name: 'Magitek Golem', hp: 85, maxHp: 85, atk: 16, shields: 3, maxShields: 3, weakness: 'thunder', staggered: false, alive: true }
    ]
  },
  {
    stage: 3,
    name: 'Sanctum of the Behemoth',
    enemies: [
      { id: 'boss', name: 'Ancient Behemoth', hp: 240, maxHp: 240, atk: 26, shields: 4, maxShields: 4, weakness: 'fire', isBoss: true, staggered: false, alive: true }
    ]
  }
];

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x3c6ef372, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 111111) {
  const numSeed = typeof seed === 'number' ? seed : 111111;

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    stage: 1,
    maxStages: 3,
    limitGauge: 20, // 0..100
    activeMemberIndex: 0,
    party: [
      { id: 'aiden', name: 'Aiden (Knight)', role: 'tank', hp: 120, maxHp: 120, mp: 35, maxMp: 35, defending: false, taunting: false },
      { id: 'lyra', name: 'Lyra (Mage)', role: 'dps', hp: 75, maxHp: 75, mp: 80, maxMp: 80, defending: false, taunting: false },
      { id: 'rowan', name: 'Rowan (Cleric)', role: 'healer', hp: 85, maxHp: 85, mp: 75, maxMp: 75, defending: false, taunting: false }
    ],
    enemies: BATTLES[0].enemies.map(e => ({ ...e })),
    history: ['Battle Engaged! Aiden, Lyra, and Rowan enter the Glacial Caverns!'],
    winner: null,
    done: false
  };
}

function getActiveMember(state) {
  // Find current alive member without mutating state
  for (let i = 0; i < state.party.length; i++) {
    const idx = (state.activeMemberIndex + i) % state.party.length;
    if (state.party[idx].hp > 0) {
      return state.party[idx];
    }
  }
  return null;
}

function legalActions(state) {
  if (state.done) return [];
  const m = getActiveMember(state);
  if (!m) return [];

  const actions = [];
  const aliveEnemies = state.enemies.filter(e => e.alive);

  // 1. Basic attack
  aliveEnemies.forEach((e, idx) => {
    actions.push(`attack:${idx}`);
  });

  // 2. Class Abilities
  if (m.id === 'aiden') {
    if (m.mp >= 8) actions.push('skill_taunt:self');
    if (m.mp >= 12) {
      aliveEnemies.forEach((e, idx) => {
        actions.push(`skill_power_slash:${idx}`);
      });
    }
  } else if (m.id === 'lyra') {
    if (m.mp >= 10) {
      aliveEnemies.forEach((e, idx) => {
        actions.push(`skill_fire:${idx}`);
        actions.push(`skill_blizzard:${idx}`);
        actions.push(`skill_thunder:${idx}`);
      });
    }
  } else if (m.id === 'rowan') {
    if (m.mp >= 12) {
      state.party.forEach((p, pIdx) => {
        if (p.hp > 0 && p.hp < p.maxHp) {
          actions.push(`skill_cure:${pIdx}`);
        }
      });
    }
    if (m.mp >= 20) {
      state.party.forEach((p, pIdx) => {
        if (p.hp === 0) {
          actions.push(`skill_revive:${pIdx}`);
        }
      });
    }
    if (m.mp >= 14) {
      aliveEnemies.forEach((e, idx) => {
        actions.push(`skill_holy:${idx}`);
      });
    }
  }

  // 3. Defend / Focus (+6 MP, half dmg)
  actions.push('defend:self');

  // 4. Limit Break (if gauge is 100)
  if (state.limitGauge >= 100) {
    if (m.id === 'rowan') {
      actions.push('limit_break:party');
    } else {
      aliveEnemies.forEach((e, idx) => {
        actions.push(`limit_break:${idx}`);
      });
    }
  }

  return actions;
}

function applyDamageToEnemy(state, enemy, rawDmg, element = 'physical') {
  let mult = 1.0;

  // Check weakness
  if (enemy.weakness === element) {
    mult = 1.35;
    if (enemy.shields > 0) {
      enemy.shields--;
      state.limitGauge = Math.min(100, state.limitGauge + 15);
      if (enemy.shields === 0 && !enemy.staggered) {
        enemy.staggered = true;
        state.history.push(`SHIELD SHATTERED! ${enemy.name} is now STAGGERED!`);
      }
    }
  }

  // Staggered double damage
  if (enemy.staggered) {
    mult *= 2.0;
  }

  const dmg = Math.max(3, Math.floor(rawDmg * mult));
  enemy.hp = Math.max(0, enemy.hp - dmg);

  if (enemy.hp === 0) {
    enemy.alive = false;
    state.history.push(`${enemy.name} was defeated!`);
  }

  return dmg;
}

function executeEnemyPhase(state) {
  const livingParty = state.party.filter(p => p.hp > 0);
  if (livingParty.length === 0) return;

  state.enemies.forEach(e => {
    if (!e.alive) return;

    if (e.staggered) {
      e.staggered = false;
      e.shields = e.maxShields;
      state.history.push(`${e.name} recovered from Stagger and restored shields.`);
      return;
    }

    // Pick target: prefer taunting hero
    let target = livingParty.find(p => p.taunting);
    if (!target) {
      target = livingParty[Math.floor(createRng(state.seed + state.turn)() * livingParty.length)];
    }

    let dmg = e.atk;
    if (target.defending) dmg = Math.max(2, Math.floor(dmg * 0.5));
    if (target.role === 'tank') dmg = Math.max(2, Math.floor(dmg * 0.85));

    target.hp = Math.max(0, target.hp - dmg);
    target.defending = false;
    target.taunting = false;

    // Gain Limit gauge on taking damage
    state.limitGauge = Math.min(100, state.limitGauge + 12);
    state.history.push(`${e.name} attacked ${target.name} for ${dmg} damage!`);
  });

  // Boss weakness rotation in Stage 3
  const boss = state.enemies.find(e => e.isBoss && e.alive);
  if (boss && state.turn % 2 === 0) {
    const weaknesses = ['fire', 'ice', 'thunder'];
    const curIdx = weaknesses.indexOf(boss.weakness);
    boss.weakness = weaknesses[(curIdx + 1) % 3];
    state.history.push(`Ancient Behemoth shifted elemental resonance! Weakness is now ${boss.weakness.toUpperCase()}!`);
  }
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
  const m = getActiveMember(state);
  const aliveEnemies = state.enemies.filter(e => e.alive);

  // Parse action: type:target
  const parts = action.split(':');
  const act = parts[0];
  const targetIdx = parts[1] === 'self' || parts[1] === 'party' ? parts[1] : Number(parts[1]);

  if (act === 'attack') {
    const enemy = aliveEnemies[targetIdx];
    const dmg = applyDamageToEnemy(state, enemy, m.role === 'tank' ? 22 : 14, 'physical');
    reward += 6;
    state.history.push(`${m.name} struck ${enemy.name} for ${dmg} damage.`);
  } else if (act === 'skill_power_slash') {
    m.mp -= 12;
    const enemy = aliveEnemies[targetIdx];
    const dmg = applyDamageToEnemy(state, enemy, 34, 'physical');
    reward += 8;
    state.history.push(`${m.name} unleashed POWER SLASH on ${enemy.name} for ${dmg} damage!`);
  } else if (act === 'skill_taunt') {
    m.mp -= 8;
    m.taunting = true;
    m.defending = true;
    reward += 4;
    state.history.push(`${m.name} banged shield, issuing an Iron Taunt!`);
  } else if (act === 'skill_fire') {
    m.mp -= 10;
    const enemy = aliveEnemies[targetIdx];
    const dmg = applyDamageToEnemy(state, enemy, 26, 'fire');
    reward += 8;
    state.history.push(`${m.name} incanted FIRE upon ${enemy.name} for ${dmg} damage!`);
  } else if (act === 'skill_blizzard') {
    m.mp -= 10;
    const enemy = aliveEnemies[targetIdx];
    const dmg = applyDamageToEnemy(state, enemy, 26, 'ice');
    reward += 8;
    state.history.push(`${m.name} summoned BLIZZARD shards on ${enemy.name} for ${dmg} damage!`);
  } else if (act === 'skill_thunder') {
    m.mp -= 10;
    const enemy = aliveEnemies[targetIdx];
    const dmg = applyDamageToEnemy(state, enemy, 26, 'thunder');
    reward += 8;
    state.history.push(`${m.name} called down THUNDER bolts upon ${enemy.name} for ${dmg} damage!`);
  } else if (act === 'skill_cure') {
    m.mp -= 12;
    const ally = state.party[targetIdx];
    const heal = Math.min(40, ally.maxHp - ally.hp);
    ally.hp += heal;
    reward += 6;
    state.history.push(`${m.name} channeled CURE, restoring ${heal} HP to ${ally.name}.`);
  } else if (act === 'skill_revive') {
    m.mp -= 20;
    const ally = state.party[targetIdx];
    ally.hp = Math.floor(ally.maxHp * 0.4);
    reward += 15;
    state.history.push(`${m.name} invoked SACRED REVIVAL! ${ally.name} returned to battle!`);
  } else if (act === 'skill_holy') {
    m.mp -= 14;
    const enemy = aliveEnemies[targetIdx];
    const dmg = applyDamageToEnemy(state, enemy, 28, 'holy');
    reward += 7;
    state.history.push(`${m.name} cast HOLY ray on ${enemy.name} for ${dmg} damage.`);
  } else if (act === 'defend') {
    m.defending = true;
    m.mp = Math.min(m.maxMp, m.mp + 6);
    reward += 2;
    state.history.push(`${m.name} guarded, mitigating damage and focusing mind (+6 MP).`);
  } else if (act === 'limit_break') {
    state.limitGauge = 0;
    reward += 25;
    if (m.id === 'aiden') {
      const enemy = aliveEnemies[targetIdx];
      const dmg = applyDamageToEnemy(state, enemy, 75, 'physical');
      state.history.push(`LIMIT BREAK: OMNISLASH! Aiden tore through ${enemy.name} for ${dmg} catastrophic damage!`);
    } else if (m.id === 'lyra') {
      state.enemies.forEach(e => {
        if (e.alive) applyDamageToEnemy(state, e, 55, 'fire');
      });
      state.history.push('LIMIT BREAK: METEOR CASCADE! Lyra rained apocalyptic fire on all foes!');
    } else {
      state.party.forEach(p => {
        if (p.hp > 0) p.hp = p.maxHp;
        else p.hp = Math.floor(p.maxHp * 0.5);
      });
      state.history.push('LIMIT BREAK: AURA OF REBIRTH! Rowan restored the entire party to life and vigor!');
    }
  }

  // Check if current battle stage is cleared
  const stageWon = state.enemies.every(e => !e.alive);
  if (stageWon) {
    if (state.stage < state.maxStages) {
      state.stage++;
      state.enemies = BATTLES[state.stage - 1].enemies.map(e => ({ ...e }));
      state.activeMemberIndex = 0;
      reward += 40;
      state.history.push(`STAGE CLEARED! Advanced into ${BATTLES[state.stage - 1].name}!`);
      return { reward, done: false };
    } else {
      // Complete Game Victory: Defeated Boss
      state.done = true;
      state.winner = 'player';
      state.history.push('VICTORY OF LIGHT! Ancient Behemoth shattered! The realm is saved!');
      reward += 160;
      return { reward, done: true };
    }
  }

  // Advance to next living party member
  let looped = false;
  let nextIdx = state.activeMemberIndex + 1;
  if (nextIdx >= state.party.length) {
    nextIdx = 0;
    looped = true;
  }

  // If wrapped to 0, execute Enemy Phase
  if (looped) {
    executeEnemyPhase(state);
    state.turn++;
    if (state.turn >= state.maxTurns) {
      state.done = true;
      state.winner = 'enemy';
      state.history.push('BATTLE TIMEOUT: Party succumbed to exhaustion.');
    }
  }

  // Find next living member index
  for (let i = 0; i < state.party.length; i++) {
    const idx = (nextIdx + i) % state.party.length;
    if (state.party[idx].hp > 0) {
      state.activeMemberIndex = idx;
      break;
    }
  }

  // Check if all party members are dead
  const allDead = state.party.every(p => p.hp <= 0);
  if (allDead) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('PARTY WIPED OUT: All heroes fell in combat.');
    reward -= 70;
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let partyHp = 0;
  state.party.forEach(p => { partyHp += p.hp; });

  const stageBonus = state.stage * 100;
  const turnBonus = Math.max(0, (state.maxTurns - state.turn) * 8);
  let total = stageBonus + partyHp * 2 + turnBonus;

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
    BATTLES
  };
}