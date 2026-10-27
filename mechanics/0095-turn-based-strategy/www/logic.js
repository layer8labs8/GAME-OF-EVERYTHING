// Pure deterministic simulation logic for 0095-turn-based-strategy (Empire & Hexes)

const MAX_TURNS = 35;
const GRID_SIZE = 6;
const RUSH_GOLD_COST = 50;

const MOUNTAIN_TILES = [
  { r: 0, c: 3 }, { r: 2, c: 1 },
  { r: 3, c: 4 }, { r: 5, c: 2 }
];

const HILL_TILES = [
  { r: 1, c: 3 }, { r: 3, c: 2 },
  { r: 4, c: 1 }, { r: 4, c: 3 }
];

const FOREST_TILES = [
  { r: 0, c: 1 }, { r: 1, c: 4 },
  { r: 2, c: 5 }, { r: 4, c: 5 }
];

const UNIT_SPECS = {
  swordsman: { name: 'Swordsman', hp: 50, atk: 25, mp: 2, range: 1, cost: 30 },
  archer: { name: 'Bowman', hp: 35, atk: 20, mp: 2, range: 2, cost: 40 },
  knight: { name: 'Knight', hp: 60, atk: 30, mp: 3, range: 1, cost: 60 }
};

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
    turn: 1,
    maxTurns: MAX_TURNS,
    gold: 30,
    enemyGold: 30,
    nextUnitId: 3,
    cities: [
      { id: 0, name: 'Valenhold', r: 1, c: 1, owner: 'player', isCapital: true, prod: 8, gold: 5, queue: 'swordsman', progress: 0 },
      { id: 1, name: 'Khorad', r: 4, c: 4, owner: 'enemy', isCapital: true, prod: 8, gold: 5, queue: 'swordsman', progress: 0 },
      { id: 2, name: 'Oasis', r: 2, c: 3, owner: 'neutral', isCapital: false, prod: 4, gold: 4, queue: null, progress: 0 }
    ],
    units: [
      { id: 1, type: 'swordsman', team: 'player', r: 1, c: 1, hp: 50, maxHp: 50, atk: 25, mp: 2, maxMp: 2, range: 1 },
      { id: 2, type: 'swordsman', team: 'enemy', r: 4, c: 4, hp: 50, maxHp: 50, atk: 25, mp: 2, maxMp: 2, range: 1 }
    ],
    history: ['Empire campaign begun. March on enemy citadels and expand dominion.'],
    winner: null,
    result: null,
    done: false
  };
}

function isMountain(r, c) {
  return MOUNTAIN_TILES.some(m => m.r === r && m.c === c);
}

function isHill(r, c) {
  return HILL_TILES.some(h => h.r === r && h.c === c);
}

function isForest(r, c) {
  return FOREST_TILES.some(f => f.r === r && f.c === c);
}

function getMoveCost(r, c) {
  if (isMountain(r, c)) return 999;
  if (isHill(r, c)) return 2;
  return 1;
}

function getDefenseBonus(r, c) {
  if (isHill(r, c)) return 0.25;
  if (isForest(r, c)) return 0.15;
  return 0.0;
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const playerUnits = state.units.filter(u => u.team === 'player' && u.hp > 0);
  const enemyUnits = state.units.filter(u => u.team === 'enemy' && u.hp > 0);

  // 1. Movement orders
  for (let i = 0; i < playerUnits.length; i++) {
    const u = playerUnits[i];
    if (u.mp > 0) {
      const neighbors = [
        { r: u.r - 1, c: u.c }, { r: u.r + 1, c: u.c },
        { r: u.r, c: u.c - 1 }, { r: u.r, c: u.c + 1 }
      ];
      for (let n = 0; n < neighbors.length; n++) {
        const nr = neighbors[n].r;
        const nc = neighbors[n].c;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          const cost = getMoveCost(nr, nc);
          if (u.mp >= cost) {
            // Cannot walk onto friendly unit or enemy unit directly (must attack)
            const occupied = state.units.some(o => o.hp > 0 && o.r === nr && o.c === nc);
            if (!occupied) {
              actions.push(`move:${u.id}:${nr},${nc}`);
            }
          }
        }
      }
    }
  }

  // 2. Attack orders
  for (let i = 0; i < playerUnits.length; i++) {
    const u = playerUnits[i];
    if (u.mp > 0) {
      for (let j = 0; j < enemyUnits.length; j++) {
        const e = enemyUnits[j];
        const dist = Math.abs(u.r - e.r) + Math.abs(u.c - e.c);
        if (dist <= u.range) {
          actions.push(`attack:${u.id}:${e.id}`);
        }
      }
    }
  }

  // 3. City production queue changes
  const playerCities = state.cities.filter(c => c.owner === 'player');
  const unitTypes = ['swordsman', 'archer', 'knight'];
  for (let i = 0; i < playerCities.length; i++) {
    const city = playerCities[i];
    for (let t = 0; t < unitTypes.length; t++) {
      if (city.queue !== unitTypes[t]) {
        actions.push(`produce:${city.id}:${unitTypes[t]}`);
      }
      if (state.gold >= RUSH_GOLD_COST) {
        actions.push(`rush_unit:${city.id}:${unitTypes[t]}`);
      }
    }
  }

  // 4. End turn
  actions.push('end_turn');

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
    const uid = parseInt(parts[1], 10);
    const coords = parts[2].split(',').map(n => parseInt(n, 10));
    const u = state.units.find(un => un.id === uid);
    const cost = getMoveCost(coords[0], coords[1]);
    u.r = coords[0];
    u.c = coords[1];
    u.mp = Math.max(0, u.mp - cost);
    reward = 1;
    state.history.push(`${UNIT_SPECS[u.type].name} marched to (${u.r}, ${u.c}).`);

    // Check city occupation immediately
    const cityOnTile = state.cities.find(c => c.r === u.r && c.c === u.c);
    if (cityOnTile && cityOnTile.owner !== 'player') {
      const prevOwner = cityOnTile.owner;
      cityOnTile.owner = 'player';
      cityOnTile.queue = 'swordsman';
      cityOnTile.progress = 0;
      reward = prevOwner === 'enemy' ? 40 : 20;
      state.history.push(`Captured ${cityOnTile.name}! City is now under your dominion.`);
      checkCityWin(state);
    }
  } else if (action.startsWith('attack:')) {
    const parts = action.split(':');
    const uid = parseInt(parts[1], 10);
    const eid = parseInt(parts[2], 10);
    const u = state.units.find(un => un.id === uid);
    const e = state.units.find(en => en.id === eid);

    u.mp = 0; // Expends all MP to attack

    // Attacker damage
    const defBonus = getDefenseBonus(e.r, e.c);
    const dmg = Math.round(u.atk * (u.hp / u.maxHp) * (1 - defBonus));
    e.hp = Math.max(0, e.hp - dmg);

    if (e.hp === 0) {
      reward = 25;
      state.history.push(`${UNIT_SPECS[u.type].name} obliterated enemy ${UNIT_SPECS[e.type].name}!`);
    } else {
      reward = 8;
      state.history.push(`${UNIT_SPECS[u.type].name} struck ${UNIT_SPECS[e.type].name} for ${dmg} damage.`);
      // Defender counter-attack if melee
      const dist = Math.abs(u.r - e.r) + Math.abs(u.c - e.c);
      if (dist === 1) {
        const retDmg = Math.round(e.atk * (e.hp / e.maxHp) * 0.7);
        u.hp = Math.max(0, u.hp - retDmg);
        if (u.hp === 0) {
          reward -= 10;
          state.history.push(`${UNIT_SPECS[u.type].name} fell to defender counter-thrust.`);
        }
      }
    }

    state.units = state.units.filter(un => un.hp > 0);
  } else if (action.startsWith('produce:')) {
    const parts = action.split(':');
    const cid = parseInt(parts[1], 10);
    const uType = parts[2];
    const city = state.cities.find(c => c.id === cid);
    city.queue = uType;
    city.progress = 0;
    reward = 1;
    state.history.push(`${city.name} began military production of ${UNIT_SPECS[uType].name}.`);
  } else if (action.startsWith('rush_unit:')) {
    const parts = action.split(':');
    const cid = parseInt(parts[1], 10);
    const uType = parts[2];
    const city = state.cities.find(c => c.id === cid);
    state.gold -= RUSH_GOLD_COST;

    const spawnTile = findFreeAdjacentTile(state, city.r, city.c);
    if (spawnTile) {
      const spec = UNIT_SPECS[uType];
      state.units.push({
        id: state.nextUnitId++,
        type: uType,
        team: 'player',
        r: spawnTile.r,
        c: spawnTile.c,
        hp: spec.hp,
        maxHp: spec.hp,
        atk: spec.atk,
        mp: 0,
        maxMp: spec.mp,
        range: spec.range
      });
      reward = 15;
      state.history.push(`Rush-mustered ${spec.name} at ${city.name}.`);
    }
  } else if (action === 'end_turn') {
    // 1. Economic harvest
    state.cities.forEach(c => {
      if (c.owner === 'player') state.gold += c.gold;
      if (c.owner === 'enemy') state.enemyGold += c.gold;
    });

    // 2. City Production advancement
    advanceCityProduction(state);

    // 3. Unit MP refreshment
    state.units.forEach(u => { u.mp = u.maxMp; });

    // 4. Enemy AI phase
    runEnemyAiTbs(state);

    // 5. Check victory / defeat
    checkCityWin(state);

    if (!state.done) {
      state.turn += 1;
      if (state.turn > state.maxTurns) {
        evaluateTimeout(state);
      }
    }

    if (state.done && state.winner === 'player') {
      reward = 100;
    } else if (state.done && state.winner === 'enemy') {
      reward = -50;
    }
  }

  return { reward, done: state.done };
}

function findFreeAdjacentTile(state, r, c) {
  const candidates = [
    { r, c },
    { r: r - 1, c }, { r: r + 1, c },
    { r, c: c - 1 }, { r: r, c: c + 1 }
  ];
  for (let i = 0; i < candidates.length; i++) {
    const cr = candidates[i].r;
    const cc = candidates[i].c;
    if (cr >= 0 && cr < GRID_SIZE && cc >= 0 && cc < GRID_SIZE && !isMountain(cr, cc)) {
      const occ = state.units.some(u => u.hp > 0 && u.r === cr && u.c === cc);
      if (!occ) return { r: cr, c: cc };
    }
  }
  return null;
}

function advanceCityProduction(state) {
  state.cities.forEach(city => {
    if (city.owner !== 'neutral' && city.queue) {
      city.progress += city.prod;
      const spec = UNIT_SPECS[city.queue];
      if (city.progress >= spec.cost) {
        city.progress -= spec.cost;
        const spawnTile = findFreeAdjacentTile(state, city.r, city.c);
        if (spawnTile) {
          state.units.push({
            id: state.nextUnitId++,
            type: city.queue,
            team: city.owner,
            r: spawnTile.r,
            c: spawnTile.c,
            hp: spec.hp,
            maxHp: spec.hp,
            atk: spec.atk,
            mp: spec.mp,
            maxMp: spec.mp,
            range: spec.range
          });
          state.history.push(`${city.name} completed battalion training of ${spec.name}.`);
        }
      }
    }
  });
}

function runEnemyAiTbs(state) {
  const enemyUnits = state.units.filter(u => u.team === 'enemy' && u.hp > 0);
  const playerUnits = state.units.filter(u => u.team === 'player' && u.hp > 0);

  // Enemy unit tactics
  for (let i = 0; i < enemyUnits.length; i++) {
    const eu = enemyUnits[i];
    if (eu.mp <= 0) continue;

    // Check if player in attack range
    let attacked = false;
    for (let j = 0; j < playerUnits.length; j++) {
      const pu = playerUnits[j];
      const dist = Math.abs(eu.r - pu.r) + Math.abs(eu.c - pu.c);
      if (dist <= eu.range) {
        const defBonus = getDefenseBonus(pu.r, pu.c);
        const dmg = Math.round(eu.atk * (eu.hp / eu.maxHp) * (1 - defBonus));
        pu.hp = Math.max(0, pu.hp - dmg);
        eu.mp = 0;
        attacked = true;
        state.history.push(`Enemy ${UNIT_SPECS[eu.type].name} attacked ${UNIT_SPECS[pu.type].name}!`);
        break;
      }
    }

    // If did not attack, march toward player capital or closest player unit
    if (!attacked && eu.mp > 0) {
      const targetR = 1;
      const targetC = 1;
      const dr = Math.sign(targetR - eu.r);
      const dc = Math.sign(targetC - eu.c);

      const tryMoves = [
        { r: eu.r + dr, c: eu.c },
        { r: eu.r, c: eu.c + dc }
      ];

      for (let m = 0; m < tryMoves.length; m++) {
        const nr = tryMoves[m].r;
        const nc = tryMoves[m].c;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !isMountain(nr, nc)) {
          const cost = getMoveCost(nr, nc);
          const occ = state.units.some(u => u.hp > 0 && u.r === nr && u.c === nc);
          if (!occ && eu.mp >= cost) {
            eu.r = nr;
            eu.c = nc;
            eu.mp -= cost;
            // Capture city if stepped on
            const cityHere = state.cities.find(c => c.r === nr && c.c === nc);
            if (cityHere && cityHere.owner !== 'enemy') {
              cityHere.owner = 'enemy';
              state.history.push(`Enemy forces seized ${cityHere.name}!`);
            }
            break;
          }
        }
      }
    }
  }

  // Remove dead units
  state.units = state.units.filter(u => u.hp > 0);
}

function checkCityWin(state) {
  const playerCapital = state.cities.find(c => c.id === 0);
  const enemyCapital = state.cities.find(c => c.id === 1);
  const playerCities = state.cities.filter(c => c.owner === 'player');

  // Victory: Enemy Capital captured or all 3 cities controlled
  if (enemyCapital.owner === 'player' || playerCities.length === 3) {
    state.done = true;
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Total Conquest Victory! Enemy citadel captured.');
    return;
  }

  // Defeat: Player Capital captured
  if (playerCapital.owner === 'enemy') {
    state.done = true;
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Defeat! Valenhold has fallen to enemy conquerors.');
  }
}

function evaluateTimeout(state) {
  state.done = true;
  const pCities = state.cities.filter(c => c.owner === 'player').length;
  const eCities = state.cities.filter(c => c.owner === 'enemy').length;

  if (pCities > eCities) {
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Time expired. Imperial supremacy achieved.');
  } else {
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Time expired. Enemy holds territorial dominance.');
  }
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let pCities = 0;
  for (let i = 0; i < state.cities.length; i++) {
    if (state.cities[i].owner === 'player') pCities++;
  }
  const pUnits = state.units.filter(u => u.team === 'player' && u.hp > 0).length;

  let s = (pCities * 200) + (pUnits * 30) + (state.gold * 1.5);
  if (state.winner === 'player') s += 500;
  s -= (state.turn - 1) * 4;

  return Math.max(0, Math.round(s));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_TURNS,
    GRID_SIZE,
    UNIT_SPECS,
    RUSH_GOLD_COST
  };
}
