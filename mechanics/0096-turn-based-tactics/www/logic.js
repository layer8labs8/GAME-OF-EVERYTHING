// Pure deterministic simulation logic for 0096-turn-based-tactics (X-Vanguard TBT)

const MAX_ROUNDS = 20;
const GRID_SIZE = 8;

const FULL_COVER_WALLS = [
  { r: 2, c: 2 }, { r: 2, c: 5 },
  { r: 5, c: 2 }, { r: 5, c: 5 }
];

const HALF_COVER_BARRICADES = [
  { r: 1, c: 3 }, { r: 2, c: 3 },
  { r: 5, c: 4 }, { r: 6, c: 4 },
  { r: 3, c: 2 }, { r: 4, c: 5 }
];

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
    round: 1,
    maxRounds: MAX_ROUNDS,
    squad: [
      { id: 'assault', name: 'Striker (Assault)', r: 0, c: 1, hp: 70, maxHp: 70, ap: 2, range: 2, dmg: 35, grenades: 1, overwatch: false },
      { id: 'sniper', name: 'Ghost (Sniper)', r: 0, c: 3, hp: 50, maxHp: 50, ap: 2, range: 5, dmg: 45, grenades: 0, overwatch: false },
      { id: 'support', name: 'Doc (Support)', r: 0, c: 5, hp: 60, maxHp: 60, ap: 2, range: 3, dmg: 25, medkits: 2, overwatch: false }
    ],
    enemies: [
      { id: 'trooper1', name: 'Sectoid A', r: 6, c: 2, hp: 40, maxHp: 40, range: 3, dmg: 20 },
      { id: 'trooper2', name: 'Sectoid B', r: 6, c: 5, hp: 40, maxHp: 40, range: 3, dmg: 20 },
      { id: 'mech', name: 'Berserker Mech', r: 7, c: 3, hp: 90, maxHp: 90, range: 2, dmg: 35 }
    ],
    history: ['Vanguard deployed into the hot zone. Take cover and eliminate alien hostiles.'],
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

function isFullCover(r, c) {
  return FULL_COVER_WALLS.some(w => w.r === r && w.c === c);
}

function isHalfCover(r, c) {
  return HALF_COVER_BARRICADES.some(b => b.r === r && b.c === c);
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
      if (isFullCover(r, c)) return false;
    }
  }
  return true;
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const aliveSquad = state.squad.filter(u => u.hp > 0 && u.ap > 0);
  const aliveEnemies = state.enemies.filter(e => e.hp > 0);

  // 1. Move orders
  for (let i = 0; i < aliveSquad.length; i++) {
    const u = aliveSquad[i];
    const deltas = [
      { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 },
      { r: -1, c: -1 }, { r: -1, c: 1 }, { r: 1, c: -1 }, { r: 1, c: 1 }
    ];
    for (let d = 0; d < deltas.length; d++) {
      const nr = u.r + deltas[d].r;
      const nc = u.c + deltas[d].c;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        if (!isFullCover(nr, nc)) {
          const occupied = state.squad.some(s => s.hp > 0 && s.r === nr && s.c === nc) ||
                           state.enemies.some(e => e.hp > 0 && e.r === nr && e.c === nc);
          if (!occupied) {
            actions.push(`move:${u.id}:${nr},${nc}`);
          }
        }
      }
    }
  }

  // 2. Shoot orders
  for (let i = 0; i < aliveSquad.length; i++) {
    const u = aliveSquad[i];
    for (let j = 0; j < aliveEnemies.length; j++) {
      const e = aliveEnemies[j];
      const dist = Math.hypot(u.r - e.r, u.c - e.c);
      if (dist <= u.range && hasLineOfSight(u.r, u.c, e.r, e.c)) {
        actions.push(`shoot:${u.id}:${e.id}`);
      }
    }
  }

  // 3. Frag Grenade (Assault)
  const assault = aliveSquad.find(u => u.id === 'assault' && u.grenades > 0);
  if (assault) {
    for (let j = 0; j < aliveEnemies.length; j++) {
      const e = aliveEnemies[j];
      const dist = Math.hypot(assault.r - e.r, assault.c - e.c);
      if (dist <= 3) {
        actions.push(`frag_grenade:${assault.id}:${e.r},${e.c}`);
      }
    }
  }

  // 4. Overwatch
  for (let i = 0; i < aliveSquad.length; i++) {
    const u = aliveSquad[i];
    if (!u.overwatch) {
      actions.push(`overwatch:${u.id}`);
    }
  }

  // 5. First Aid Medkit (Support)
  const support = aliveSquad.find(u => u.id === 'support' && u.medkits > 0);
  if (support) {
    const woundedAllies = state.squad.filter(a => a.hp > 0 && a.hp < a.maxHp);
    for (let i = 0; i < woundedAllies.length; i++) {
      const ally = woundedAllies[i];
      const dist = Math.hypot(support.r - ally.r, support.c - ally.c);
      if (dist <= 1.5) {
        actions.push(`field_medkit:${support.id}:${ally.id}`);
      }
    }
  }

  // 6. End Turn is always legal
  actions.push('end_turn');

  return actions;
}

function calculateHitAndDamage(state, attacker, defender) {
  let hitChance = 0.85;
  const dist = Math.hypot(attacker.r - defender.r, attacker.c - defender.c);

  if (isHalfCover(defender.r, defender.c)) {
    hitChance -= 0.20;
  }
  if (dist > attacker.range) {
    hitChance -= 0.25;
  }

  const roll = getRngValue(state);
  if (roll <= hitChance) {
    // Crit check
    let critChance = 0.15;
    if (!isHalfCover(defender.r, defender.c)) {
      critChance += 0.30; // Flanking crit
    }
    const isCrit = getRngValue(state) <= critChance;
    const dmg = isCrit ? Math.round(attacker.dmg * 1.5) : attacker.dmg;
    return { hit: true, dmg, isCrit };
  }

  return { hit: false, dmg: 0, isCrit: false };
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
    u.ap -= 1;
    reward = 1;
    state.history.push(`${u.name} dashed to (${u.r}, ${u.c}).`);
  } else if (action.startsWith('shoot:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const eid = parts[2];
    const u = state.squad.find(sq => sq.id === uid);
    const e = state.enemies.find(en => en.id === eid);
    u.ap -= 1;

    const shot = calculateHitAndDamage(state, u, e);
    if (shot.hit) {
      e.hp = Math.max(0, e.hp - shot.dmg);
      if (e.hp === 0) {
        reward = e.id === 'mech' ? 60 : 30;
        state.history.push(`${u.name} killed ${e.name} with ${shot.isCrit ? 'CRITICAL ' : ''}${shot.dmg} damage!`);
      } else {
        reward = 10;
        state.history.push(`${u.name} hit ${e.name} for ${shot.dmg} damage.`);
      }
    } else {
      reward = 0;
      state.history.push(`${u.name} shot missed ${e.name}.`);
    }

    state.enemies = state.enemies.filter(en => en.hp > 0);
  } else if (action.startsWith('frag_grenade:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const coords = parts[2].split(',').map(n => parseInt(n, 10));
    const u = state.squad.find(sq => sq.id === uid);
    u.grenades -= 1;
    u.ap -= 1;

    // AOE explosion around coords
    state.enemies.forEach(e => {
      const dist = Math.hypot(coords[0] - e.r, coords[1] - e.c);
      if (dist <= 1.5) {
        e.hp = Math.max(0, e.hp - 35);
        reward += 15;
      }
    });
    state.history.push(`${u.name} detonated Frag Grenade at (${coords[0]}, ${coords[1]})!`);
    state.enemies = state.enemies.filter(en => en.hp > 0);
  } else if (action.startsWith('overwatch:')) {
    const uid = action.split(':')[1];
    const u = state.squad.find(sq => sq.id === uid);
    u.overwatch = true;
    u.ap = 0;
    reward = 2;
    state.history.push(`${u.name} assumed reactive Overwatch.`);
  } else if (action.startsWith('field_medkit:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const targetId = parts[2];
    const u = state.squad.find(sq => sq.id === uid);
    const ally = state.squad.find(sq => sq.id === targetId);
    u.medkits -= 1;
    u.ap -= 1;
    ally.hp = Math.min(ally.maxHp, ally.hp + 35);
    reward = 8;
    state.history.push(`${u.name} treated ${ally.name} with field trauma medkit (+35 HP).`);
  } else if (action === 'end_turn') {
    // Enemy Alien Turn execution
    runAlienTurn(state);

    // Refresh Squad AP and clear overwatch
    state.squad.forEach(u => {
      u.ap = 2;
      u.overwatch = false;
    });

    // Check Victory / Defeat
    checkGameStatus(state);

    if (!state.done) {
      state.round += 1;
      if (state.round > state.maxRounds) {
        evaluateTimeout(state);
      }
    }

    if (state.done && state.winner === 'player') {
      reward = 100;
    } else if (state.done && state.winner === 'enemy') {
      reward = -50;
    }
  }

  checkGameStatus(state);

  return { reward, done: state.done };
}

function runAlienTurn(state) {
  const aliveEnemies = state.enemies.filter(e => e.hp > 0);
  const aliveSquad = state.squad.filter(u => u.hp > 0);

  if (aliveSquad.length === 0) return;

  for (let i = 0; i < aliveEnemies.length; i++) {
    const e = aliveEnemies[i];

    // Check targets in range and sight
    const targets = [];
    for (let j = 0; j < aliveSquad.length; j++) {
      const u = aliveSquad[j];
      const dist = Math.hypot(e.r - u.r, e.c - u.c);
      if (dist <= e.range && hasLineOfSight(e.r, e.c, u.r, u.c)) {
        targets.push(u);
      }
    }

    if (targets.length > 0) {
      targets.sort((a, b) => a.hp - b.hp);
      const chosen = targets[0];
      const shot = calculateHitAndDamage(state, e, chosen);
      if (shot.hit) {
        chosen.hp = Math.max(0, chosen.hp - shot.dmg);
        state.history.push(`${e.name} shot ${chosen.name} for ${shot.dmg} damage!`);
      } else {
        state.history.push(`${e.name} shot missed ${chosen.name}.`);
      }
    } else {
      // Step closer to closest commando
      aliveSquad.sort((a, b) => Math.hypot(e.r - a.r, e.c - a.c) - Math.hypot(e.r - b.r, e.c - b.c));
      const closest = aliveSquad[0];
      const dr = Math.sign(closest.r - e.r);
      const dc = Math.sign(closest.c - e.c);
      const nr = e.r + dr;
      const nc = e.c + dc;

      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !isFullCover(nr, nc)) {
        const occ = state.squad.some(s => s.hp > 0 && s.r === nr && s.c === nc) ||
                    state.enemies.some(en => en.hp > 0 && en.r === nr && en.c === nc);
        if (!occ) {
          e.r = nr;
          e.c = nc;

          // Check if triggered any player overwatch!
          for (let k = 0; k < state.squad.length; k++) {
            const owUnit = state.squad[k];
            if (owUnit.hp > 0 && owUnit.overwatch) {
              const owDist = Math.hypot(owUnit.r - e.r, owUnit.c - e.c);
              if (owDist <= owUnit.range && hasLineOfSight(owUnit.r, owUnit.c, e.r, e.c)) {
                owUnit.overwatch = false; // Expended
                const owShot = calculateHitAndDamage(state, owUnit, e);
                if (owShot.hit) {
                  e.hp = Math.max(0, e.hp - owShot.dmg);
                  state.history.push(`OVERWATCH! ${owUnit.name} ambushed ${e.name} for ${owShot.dmg} damage!`);
                }
                break;
              }
            }
          }
        }
      }
    }
  }

  state.squad = state.squad.filter(u => u.hp > 0);
  state.enemies = state.enemies.filter(e => e.hp > 0);
}

function checkGameStatus(state) {
  const aliveSquad = state.squad.filter(u => u.hp > 0);
  const aliveEnemies = state.enemies.filter(e => e.hp > 0);

  if (aliveEnemies.length === 0) {
    state.done = true;
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Tactical Victory! All alien hostiles neutralized.');
    return;
  }

  if (aliveSquad.length === 0) {
    state.done = true;
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Mission Failure. Entire Vanguard squad neutralized.');
  }
}

function evaluateTimeout(state) {
  state.done = true;
  const aliveSquad = state.squad.filter(u => u.hp > 0).length;
  const aliveEnemies = state.enemies.filter(e => e.hp > 0).length;

  if (aliveSquad >= aliveEnemies) {
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Operation completed. Hostile forces pushed into retreat.');
  } else {
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Operation aborted. Heavy hostile presence.');
  }
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let s = 0;
  for (let i = 0; i < state.squad.length; i++) {
    s += state.squad[i].hp * 2;
  }
  for (let i = 0; i < state.enemies.length; i++) {
    s += (state.enemies[i].maxHp - state.enemies[i].hp) * 2;
  }
  if (state.winner === 'player') s += 500;
  s -= (state.round - 1) * 5;

  return Math.max(0, Math.round(s));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_ROUNDS,
    GRID_SIZE,
    FULL_COVER_WALLS,
    HALF_COVER_BARRICADES
  };
}
