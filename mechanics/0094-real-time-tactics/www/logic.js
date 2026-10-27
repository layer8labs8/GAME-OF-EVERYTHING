// Pure deterministic simulation logic for 0094-real-time-tactics (Commando Strike RTT)

const MAX_TICKS = 60;
const GRID_SIZE = 8;

const WALL_TILES = [
  { r: 2, c: 2 }, { r: 2, c: 3 },
  { r: 4, c: 4 }, { r: 5, c: 4 },
  { r: 1, c: 5 }, { r: 6, c: 2 }
];

const COVER_TILES = [
  { r: 1, c: 2 }, { r: 3, c: 3 },
  { r: 3, c: 4 }, { r: 5, c: 2 },
  { r: 6, c: 5 }
];

const EXTRACTION_POINT = { r: 7, c: 7 };

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
    squad: [
      { id: 'sniper', name: 'Eagle (Sniper)', r: 0, c: 0, hp: 50, maxHp: 50, range: 4, dmg: 45, headshots: 2, moveRange: 2 },
      { id: 'heavy', name: 'Rhino (Heavy)', r: 0, c: 1, hp: 120, maxHp: 120, range: 2, dmg: 30, moveRange: 2 },
      { id: 'medic', name: 'Fox (Saboteur)', r: 1, c: 0, hp: 70, maxHp: 70, range: 2, dmg: 20, medkits: 3, moveRange: 2 }
    ],
    enemies: [
      { id: 'sentry1', name: 'Sentry Alpha', r: 2, c: 5, hp: 50, maxHp: 50, range: 2, dmg: 15, isMobile: true },
      { id: 'sentry2', name: 'Sentry Bravo', r: 4, c: 2, hp: 50, maxHp: 50, range: 2, dmg: 15, isMobile: true },
      { id: 'turret', name: 'Watchtower Turret', r: 3, c: 6, hp: 90, maxHp: 90, range: 3, dmg: 20, isMobile: false },
      { id: 'boss', name: 'Syndicate Commander', r: 6, c: 6, hp: 140, maxHp: 140, range: 2, dmg: 25, isMobile: true }
    ],
    history: ['Commando infiltration initiated. Neutralize enemy commander and reach extraction bunker.'],
    winner: null,
    result: null,
    done: false
  };
}

function isWall(r, c) {
  return WALL_TILES.some(w => w.r === r && w.c === c);
}

function isCover(r, c) {
  return COVER_TILES.some(cv => cv.r === r && cv.c === c);
}

function hasLineOfSight(r1, c1, r2, c2) {
  const dist = Math.hypot(r2 - r1, c2 - c1);
  if (dist === 0) return true;
  const steps = Math.ceil(dist * 2);
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const r = Math.round(r1 + (r2 - r1) * t);
    const c = Math.round(c1 + (c2 - c1) * t);
    if ((r !== r1 || c !== c1) && (r !== r2 || c !== c2)) {
      if (isWall(r, c)) return false;
    }
  }
  return true;
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const aliveSquad = state.squad.filter(u => u.hp > 0);
  const aliveEnemies = state.enemies.filter(e => e.hp > 0);

  // 1. Move orders
  for (let i = 0; i < aliveSquad.length; i++) {
    const u = aliveSquad[i];
    for (let dr = -u.moveRange; dr <= u.moveRange; dr++) {
      for (let dc = -u.moveRange; dc <= u.moveRange; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = u.r + dr;
        const nc = u.c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (!isWall(nr, nc)) {
            // Check unoccupied by living ally or living enemy
            const allyHere = aliveSquad.some(a => a.r === nr && a.c === nc);
            const enemyHere = aliveEnemies.some(e => e.r === nr && e.c === nc);
            if (!allyHere && !enemyHere) {
              actions.push(`move:${u.id}:${nr},${nc}`);
            }
          }
        }
      }
    }
  }

  // 2. Direct attack orders
  for (let i = 0; i < aliveSquad.length; i++) {
    const u = aliveSquad[i];
    for (let j = 0; j < aliveEnemies.length; j++) {
      const e = aliveEnemies[j];
      const dist = Math.hypot(u.r - e.r, u.c - e.c);
      if (dist <= u.range && hasLineOfSight(u.r, u.c, e.r, e.c)) {
        actions.push(`attack:${u.id}:${e.id}`);
      }
    }
  }

  // 3. Sniper Headshot special
  const sniper = aliveSquad.find(u => u.id === 'sniper');
  if (sniper && sniper.headshots > 0) {
    for (let j = 0; j < aliveEnemies.length; j++) {
      const e = aliveEnemies[j];
      const dist = Math.hypot(sniper.r - e.r, sniper.c - e.c);
      if (dist <= 5 && hasLineOfSight(sniper.r, sniper.c, e.r, e.c)) {
        actions.push(`headshot:${e.id}`);
      }
    }
  }

  // 4. Medic heal special
  const medic = aliveSquad.find(u => u.id === 'medic');
  if (medic && medic.medkits > 0) {
    for (let i = 0; i < aliveSquad.length; i++) {
      const ally = aliveSquad[i];
      if (ally.hp < ally.maxHp) {
        const dist = Math.hypot(medic.r - ally.r, medic.c - ally.c);
        if (dist <= 1.5) {
          actions.push(`heal:${ally.id}`);
        }
      }
    }
  }

  // 5. Hold / wait is always legal
  actions.push('wait');

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

  if (action.startsWith('move:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const coords = parts[2].split(',').map(n => parseInt(n, 10));
    const u = state.squad.find(sq => sq.id === uid);
    u.r = coords[0];
    u.c = coords[1];
    reward = 1;
    state.history.push(`${u.name} maneuvered to (${u.r}, ${u.c}).`);

    // Check if reached extraction
    if (u.r === EXTRACTION_POINT.r && u.c === EXTRACTION_POINT.c) {
      reward += 15;
    }
  } else if (action.startsWith('attack:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const eid = parts[2];
    const u = state.squad.find(sq => sq.id === uid);
    const e = state.enemies.find(en => en.id === eid);

    const dmg = isCover(e.r, e.c) ? Math.round(u.dmg * 0.5) : u.dmg;
    e.hp = Math.max(0, e.hp - dmg);

    if (e.hp === 0) {
      reward += e.id === 'boss' ? 50 : 20;
      state.history.push(`${u.name} neutralized ${e.name}!`);
    } else {
      reward += 5;
      state.history.push(`${u.name} fired on ${e.name} for ${dmg} damage.`);
    }
  } else if (action.startsWith('headshot:')) {
    const eid = action.split(':')[1];
    const sniper = state.squad.find(sq => sq.id === 'sniper');
    const e = state.enemies.find(en => en.id === eid);
    sniper.headshots -= 1;

    const dmg = 75;
    e.hp = Math.max(0, e.hp - dmg);
    if (e.hp === 0) {
      reward += e.id === 'boss' ? 60 : 25;
      state.history.push(`Eagle landed precision headshot! ${e.name} eliminated.`);
    } else {
      reward += 10;
      state.history.push(`Eagle precision headshot struck ${e.name} for ${dmg} damage.`);
    }
  } else if (action.startsWith('heal:')) {
    const targetId = action.split(':')[1];
    const medic = state.squad.find(sq => sq.id === 'medic');
    const ally = state.squad.find(sq => sq.id === targetId);
    medic.medkits -= 1;
    ally.hp = Math.min(ally.maxHp, ally.hp + 40);
    reward = 8;
    state.history.push(`Fox applied field trauma medkit to ${ally.name}. Restored 40 HP.`);
  }

  // --- ENEMY AI COUNTER-ACTION PHASE ---
  runEnemyTacticalAi(state);

  // Check Victory and Defeat conditions
  checkMissionStatus(state);

  if (!state.done) {
    state.tick += 1;
    if (state.tick > state.maxTicks) {
      evaluateTimeoutConclusion(state);
      reward = state.winner === 'player' ? 60 : -30;
    }
  }

  if (state.done && state.winner === 'player') {
    reward += 100;
  } else if (state.done && state.winner === 'enemy') {
    reward -= 50;
  }

  return { reward, done: state.done };
}

function runEnemyTacticalAi(state) {
  const aliveEnemies = state.enemies.filter(e => e.hp > 0);
  const aliveSquad = state.squad.filter(u => u.hp > 0);

  if (aliveSquad.length === 0) return;

  for (let i = 0; i < aliveEnemies.length; i++) {
    const e = aliveEnemies[i];

    // Find in-range commandos
    const targets = [];
    for (let j = 0; j < aliveSquad.length; j++) {
      const u = aliveSquad[j];
      const dist = Math.hypot(e.r - u.r, e.c - u.c);
      if (dist <= e.range && hasLineOfSight(e.r, e.c, u.r, u.c)) {
        targets.push({ u, dist });
      }
    }

    if (targets.length > 0) {
      // Prioritize lowest HP
      targets.sort((a, b) => a.u.hp - b.u.hp);
      const chosen = targets[0].u;

      let dmg = e.dmg;
      if (isCover(chosen.r, chosen.c)) {
        dmg = Math.round(dmg * 0.5);
      }
      chosen.hp = Math.max(0, chosen.hp - dmg);
      state.history.push(`${e.name} opened fire on ${chosen.name} for ${dmg} damage.`);
    } else if (e.isMobile) {
      // Step closer to closest commando
      aliveSquad.sort((a, b) => Math.hypot(e.r - a.r, e.c - a.c) - Math.hypot(e.r - b.r, e.c - b.c));
      const closest = aliveSquad[0];
      const dr = Math.sign(closest.r - e.r);
      const dc = Math.sign(closest.c - e.c);

      const nr = e.r + dr;
      const nc = e.c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !isWall(nr, nc)) {
        const occ = aliveEnemies.some(o => o.r === nr && o.c === nc) || aliveSquad.some(o => o.r === nr && o.c === nc);
        if (!occ) {
          e.r = nr;
          e.c = nc;
        }
      }
    }
  }
}

function checkMissionStatus(state) {
  const aliveSquad = state.squad.filter(u => u.hp > 0);
  const boss = state.enemies.find(e => e.id === 'boss');
  const aliveEnemies = state.enemies.filter(e => e.hp > 0);

  if (aliveSquad.length === 0) {
    state.done = true;
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Commando squad wiped out. Mission failed.');
    return;
  }

  // Victory: boss neutralized AND (reached extraction bunker OR all enemies eliminated)
  const extractionReached = aliveSquad.some(u => u.r === EXTRACTION_POINT.r && u.c === EXTRACTION_POINT.c);
  if (boss.hp === 0 && (extractionReached || aliveEnemies.length === 0)) {
    state.done = true;
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Extraction complete! Syndicate Commander neutralized. Mission accomplished.');
  }
}

function evaluateTimeoutConclusion(state) {
  state.done = true;
  const boss = state.enemies.find(e => e.id === 'boss');
  const aliveSquad = state.squad.filter(u => u.hp > 0);

  if (boss.hp === 0 && aliveSquad.length > 0) {
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Time expired. Commander was eliminated; commandos evacuated safely.');
  } else {
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Time expired. Syndicate reinforcements arrived.');
  }
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let s = 0;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    s += (e.maxHp - e.hp) * 2;
    if (e.hp === 0) s += 50;
  }
  for (let i = 0; i < state.squad.length; i++) {
    s += state.squad[i].hp * 2;
  }
  if (state.winner === 'player') s += 500;
  s -= (state.tick - 1) * 3;

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
    GRID_SIZE,
    WALL_TILES,
    COVER_TILES,
    EXTRACTION_POINT
  };
}
