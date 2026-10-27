// Pure deterministic simulation logic for 0112-crpg (Grimoire & Steel)

const GRID_SIZE = 6;
const MAX_TURNS = 35;

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x243f6a88, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 112112) {
  const numSeed = typeof seed === 'number' ? seed : 112112;

  // Initialize 6x6 grid surfaces
  const surfaces = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push({ surface: 'clean', duration: 0 });
    }
    surfaces.push(row);
  }

  // Strategic starting surface hazards
  surfaces[3][2] = { surface: 'oil', duration: 99 };
  surfaces[3][3] = { surface: 'oil', duration: 99 };
  surfaces[2][4] = { surface: 'water', duration: 99 };
  surfaces[2][5] = { surface: 'water', duration: 99 };

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    surfaces,
    party: [
      { id: 'kael', name: 'Kael (Warrior)', r: 5, c: 2, hp: 90, maxHp: 90, ap: 4, maxAp: 4, alive: true },
      { id: 'valeria', name: 'Valeria (Sorceress)', r: 5, c: 3, hp: 65, maxHp: 65, ap: 4, maxAp: 4, alive: true }
    ],
    enemies: [
      { id: 'm1', name: 'Brigand Archer', r: 1, c: 1, hp: 45, maxHp: 45, atk: 14, range: 3, alive: true },
      { id: 'm2', name: 'Brigand Archer', r: 1, c: 4, hp: 45, maxHp: 45, atk: 14, range: 3, alive: true },
      { id: 'w1', name: 'Mercenary Warlord', r: 0, c: 3, hp: 80, maxHp: 80, atk: 22, range: 1, isBoss: true, alive: true }
    ],
    history: ['Tactical deployment: Kael and Valeria confront mercenary vanguard on ruined battlefield.'],
    winner: null,
    done: false
  };
}

function isOccupied(state, r, c) {
  const heroOcc = state.party.some(p => p.alive && p.r === r && p.c === c);
  const enemyOcc = state.enemies.some(e => e.alive && e.r === r && e.c === c);
  return heroOcc || enemyOcc;
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const deltas = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];

  // 1. Hero actions
  state.party.forEach((hero, hIdx) => {
    if (!hero.alive) return;

    // Move actions
    deltas.forEach(d => {
      const nr = hero.r + d.dr;
      const nc = hero.c + d.dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !isOccupied(state, nr, nc)) {
        const surf = state.surfaces[nr][nc].surface;
        const apCost = surf === 'oil' ? 2 : 1;
        if (hero.ap >= apCost) {
          actions.push(`move:${hero.id}:${nr},${nc}`);
        }
      }
    });

    // Kael melee skills
    if (hero.id === 'kael') {
      if (hero.ap >= 2) {
        state.enemies.forEach((e, eIdx) => {
          if (e.alive) {
            const dist = Math.abs(e.r - hero.r) + Math.abs(e.c - hero.c);
            if (dist === 1) {
              actions.push(`slash:${hero.id}:${eIdx}`);
              actions.push(`bash:${hero.id}:${eIdx}`);
            }
          }
        });
      }
    }

    // Valeria spells
    if (hero.id === 'valeria') {
      if (hero.ap >= 3) {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const dist = Math.abs(r - hero.r) + Math.abs(c - hero.c);
            if (dist >= 1 && dist <= 4) {
              actions.push(`ignite:${hero.id}:${r},${c}`);
              actions.push(`lightning:${hero.id}:${r},${c}`);
            }
          }
        }
      }
    }
  });

  // Turn ending
  actions.push('end_turn');

  return actions;
}

function triggerSurfaceReactions(state, r, c, element) {
  const cell = state.surfaces[r][c];

  if (element === 'fire') {
    if (cell.surface === 'oil' || cell.surface === 'clean') {
      cell.surface = 'fire';
      cell.duration = 3;
      state.history.push(`COMBO IGNITION: Oil ignited into roaring Fire at (${r}, ${c})!`);
    } else if (cell.surface === 'water') {
      cell.surface = 'clean';
      cell.duration = 0;
      state.history.push(`Steam hiss: Fire extinguished by Water at (${r}, ${c}).`);
    }
  } else if (element === 'lightning') {
    if (cell.surface === 'water') {
      cell.surface = 'electrified';
      cell.duration = 3;
      state.history.push(`COMBO SHOCK: Water puddle electrified into high-voltage shock pool at (${r}, ${c})!`);
    }
  }
}

function executeEnemyPhase(state) {
  const livingHeroes = state.party.filter(p => p.alive);
  if (livingHeroes.length === 0) return;

  state.enemies.forEach(e => {
    if (!e.alive) return;
    let enemyAp = 4;

    // Check if starting in environmental hazards
    const curSurf = state.surfaces[e.r][e.c].surface;
    if (curSurf === 'fire') {
      e.hp = Math.max(0, e.hp - 8);
      state.history.push(`${e.name} burned in Fire for 8 damage!`);
      if (e.hp === 0) { e.alive = false; return; }
    } else if (curSurf === 'electrified') {
      e.hp = Math.max(0, e.hp - 10);
      enemyAp = 2; // Stunned AP reduction
      state.history.push(`${e.name} shocked by Electrified puddle (Lost 2 AP)!`);
      if (e.hp === 0) { e.alive = false; return; }
    }

    // Target closest hero
    livingHeroes.sort((a, b) => {
      const distA = Math.abs(a.r - e.r) + Math.abs(a.c - e.c);
      const distB = Math.abs(b.r - e.r) + Math.abs(b.c - e.c);
      return distA - distB;
    });

    const target = livingHeroes[0];
    let dist = Math.abs(target.r - e.r) + Math.abs(target.c - e.c);

    // If out of range, move closer
    while (enemyAp >= 1 && dist > e.range) {
      const dr = target.r - e.r;
      const dc = target.c - e.c;
      const stepR = dr !== 0 ? (dr > 0 ? 1 : -1) : 0;
      const stepC = dc !== 0 ? (dc > 0 ? 1 : -1) : 0;

      let moved = false;
      if (Math.abs(dr) >= Math.abs(dc) && stepR !== 0 && !isOccupied(state, e.r + stepR, e.c)) {
        e.r += stepR;
        enemyAp--;
        moved = true;
      } else if (stepC !== 0 && !isOccupied(state, e.r, e.c + stepC)) {
        e.c += stepC;
        enemyAp--;
        moved = true;
      }

      if (!moved) break;
      dist = Math.abs(target.r - e.r) + Math.abs(target.c - e.c);
    }

    // Attack target if in range and AP >= 2
    if (enemyAp >= 2 && dist <= e.range) {
      target.hp = Math.max(0, target.hp - e.atk);
      enemyAp -= 2;
      state.history.push(`${e.name} attacked ${target.name} dealing ${e.atk} damage!`);
      if (target.hp === 0) {
        target.alive = false;
        state.history.push(`${target.name} collapsed in battle!`);
      }
    }
  });

  // Decay surfaces
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = state.surfaces[r][c];
      if (cell.duration > 0 && cell.duration < 90) {
        cell.duration--;
        if (cell.duration === 0) {
          cell.surface = 'clean';
        }
      }
    }
  }

  // Turn reset
  state.turn++;
  state.party.forEach(p => {
    if (p.alive) {
      const surf = state.surfaces[p.r][p.c].surface;
      if (surf === 'fire') {
        p.hp = Math.max(0, p.hp - 8);
        state.history.push(`${p.name} burned in Fire for 8 damage.`);
      }
      p.ap = surf === 'electrified' ? 2 : 4;
    }
  });
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
    const heroId = parts[1];
    const coords = parts[2].split(',').map(Number);
    const hero = state.party.find(p => p.id === heroId);

    const surf = state.surfaces[coords[0]][coords[1]].surface;
    const cost = surf === 'oil' ? 2 : 1;
    hero.ap -= cost;
    hero.r = coords[0];
    hero.c = coords[1];
    reward += 1;
    state.history.push(`${hero.name} maneuvered to (${hero.r}, ${hero.c}).`);
  } else if (action.startsWith('slash:')) {
    const parts = action.split(':');
    const hero = state.party.find(p => p.id === parts[1]);
    const target = state.enemies[Number(parts[2])];

    hero.ap -= 2;
    let dmg = 20;

    // Check flanking: is Valeria opposite of Kael relative to target?
    const otherHero = state.party.find(p => p.id !== hero.id && p.alive);
    if (otherHero) {
      const drK = hero.r - target.r;
      const drV = otherHero.r - target.r;
      const dcK = hero.c - target.c;
      const dcV = otherHero.c - target.c;
      if ((drK === -drV && drK !== 0) || (dcK === -dcV && dcK !== 0)) {
        dmg = Math.floor(dmg * 1.3);
        state.history.push(`FLANKING STRIKE! Tactical pincer dealt +30% critical damage!`);
      }
    }

    target.hp = Math.max(0, target.hp - dmg);
    reward += 10;
    state.history.push(`${hero.name} slashed ${target.name} for ${dmg} damage.`);
    if (target.hp === 0) {
      target.alive = false;
      reward += 20;
      state.history.push(`${target.name} was slain!`);
    }
  } else if (action.startsWith('bash:')) {
    const parts = action.split(':');
    const hero = state.party.find(p => p.id === parts[1]);
    const target = state.enemies[Number(parts[2])];

    hero.ap -= 2;
    target.hp = Math.max(0, target.hp - 14);

    // Knockback target away from hero
    const dr = target.r - hero.r;
    const dc = target.c - hero.c;
    const kr = target.r + dr;
    const kc = target.c + dc;
    if (kr >= 0 && kr < GRID_SIZE && kc >= 0 && kc < GRID_SIZE && !isOccupied(state, kr, kc)) {
      target.r = kr;
      target.c = kc;
      state.history.push(`SHIELD BASH shoved ${target.name} back to (${kr}, ${kc})!`);
    }

    reward += 8;
    if (target.hp === 0) {
      target.alive = false;
      reward += 20;
      state.history.push(`${target.name} was crushed and slain!`);
    }
  } else if (action.startsWith('ignite:')) {
    const parts = action.split(':');
    const hero = state.party.find(p => p.id === parts[1]);
    const coords = parts[2].split(',').map(Number);

    hero.ap -= 3;
    triggerSurfaceReactions(state, coords[0], coords[1], 'fire');

    // Damage any enemy standing on tile
    const target = state.enemies.find(e => e.alive && e.r === coords[0] && e.c === coords[1]);
    if (target) {
      target.hp = Math.max(0, target.hp - 16);
      state.history.push(`IGNITE blasted ${target.name} for 16 fire damage!`);
      if (target.hp === 0) { target.alive = false; reward += 20; }
    }
    reward += 12;
  } else if (action.startsWith('lightning:')) {
    const parts = action.split(':');
    const hero = state.party.find(p => p.id === parts[1]);
    const coords = parts[2].split(',').map(Number);

    hero.ap -= 3;
    triggerSurfaceReactions(state, coords[0], coords[1], 'lightning');

    const target = state.enemies.find(e => e.alive && e.r === coords[0] && e.c === coords[1]);
    if (target) {
      target.hp = Math.max(0, target.hp - 18);
      state.history.push(`CHAIN LIGHTNING struck ${target.name} for 18 shock damage!`);
      if (target.hp === 0) { target.alive = false; reward += 20; }
    }
    reward += 12;
  } else if (action === 'end_turn') {
    executeEnemyPhase(state);
    reward += 4;
  }

  // Check victory / defeat
  const allEnemiesDead = state.enemies.every(e => !e.alive);
  if (allEnemiesDead) {
    state.done = true;
    state.winner = 'player';
    state.history.push('CRPG TACTICAL TRIUMPH! Mercenary warband annihilated!');
    reward += 150;
    return { reward, done: true };
  }

  const allHeroesDead = state.party.every(p => !p.alive);
  if (allHeroesDead) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('TACTICAL DEFEAT: Party eradicated.');
    reward -= 60;
    return { reward, done: true };
  }

  if (state.turn >= state.maxTurns) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('STALEMATE: Reinforcements cut off retreat.');
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let partyHp = 0;
  state.party.forEach(p => { if (p.alive) partyHp += p.hp; });

  let deadEnemies = 0;
  state.enemies.forEach(e => { if (!e.alive) deadEnemies += (e.isBoss ? 120 : 60); });

  const turnBonus = Math.max(0, (state.maxTurns - state.turn) * 8);
  let total = deadEnemies + partyHp * 2 + turnBonus;

  if (state.winner === 'player') total += 200;
  return Math.max(0, total);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    GRID_SIZE
  };
}