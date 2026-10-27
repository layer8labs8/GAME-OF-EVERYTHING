// Pure deterministic simulation logic for 0106-naval-combat (Ironclad Broadside)

const GRID_SIZE = 7;
const MAX_TURNS = 40;
const DIRS = ['N', 'E', 'S', 'W'];

const VECTORS = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 }
};

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x9e3779b9, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getPortDir(dir) {
  const idx = DIRS.indexOf(dir);
  return DIRS[(idx + 3) % 4];
}

function getStarboardDir(dir) {
  const idx = DIRS.indexOf(dir);
  return DIRS[(idx + 1) % 4];
}

function createState(seed = 4242) {
  const numSeed = typeof seed === 'number' ? seed : 4242;
  const rng = createRng(numSeed);

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    wind: 'E',
    player: {
      id: 'flagship',
      name: 'HMS Sovereign (Dreadnought)',
      x: 3,
      y: 5,
      heading: 'N',
      hp: 120,
      maxHp: 120,
      portCooldown: 0,
      starboardCooldown: 0,
      repairsRemaining: 3
    },
    enemies: [
      {
        id: 'corvette',
        name: 'Raider Corvette',
        x: 1,
        y: 1,
        heading: 'S',
        hp: 45,
        maxHp: 45,
        points: 60,
        alive: true
      },
      {
        id: 'frigate',
        name: 'Iron Frigate',
        x: 5,
        y: 1,
        heading: 'S',
        hp: 70,
        maxHp: 70,
        points: 90,
        alive: true
      },
      {
        id: 'ironclad',
        name: 'Imperial Ironclad',
        x: 3,
        y: 0,
        heading: 'S',
        hp: 100,
        maxHp: 100,
        points: 150,
        alive: true
      }
    ],
    history: ['Action stations! Enemy squadron sighted on forward bearing.'],
    winner: null,
    done: false
  };
}

function getTargetInBeam(originX, originY, dir, maxRange = 3) {
  const vec = VECTORS[dir];
  const tiles = [];
  for (let d = 1; d <= maxRange; d++) {
    const tx = originX + vec.dx * d;
    const ty = originY + vec.dy * d;
    if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
      tiles.push({ x: tx, y: ty, dist: d });
    }
  }
  return tiles;
}

function findEnemyAt(state, x, y) {
  return state.enemies.find(e => e.alive && e.x === x && e.y === y);
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const p = state.player;

  // 1. Maneuver actions
  actions.push('sail_ahead');
  actions.push('rudder_port');
  actions.push('rudder_starboard');

  // 2. Firing actions
  if (p.portCooldown === 0) {
    actions.push('fire_broadside_port');
  }
  if (p.starboardCooldown === 0) {
    actions.push('fire_broadside_starboard');
  }
  actions.push('fire_bow_chaser');

  // 3. Emergency damage control repair
  if (p.repairsRemaining > 0 && p.hp < p.maxHp) {
    actions.push('damage_control');
  }

  return actions;
}

function processEnemyPhase(state) {
  const p = state.player;
  if (!p || p.hp <= 0) return;

  state.enemies.forEach(e => {
    if (!e.alive) return;

    // 1. Check if player is directly in broadside or bow arc
    const portDir = getPortDir(e.heading);
    const starDir = getStarboardDir(e.heading);

    const portTiles = getTargetInBeam(e.x, e.y, portDir, 2);
    const starTiles = getTargetInBeam(e.x, e.y, starDir, 2);
    const bowTiles = getTargetInBeam(e.x, e.y, e.heading, 3);

    const inPort = portTiles.some(t => t.x === p.x && t.y === p.y);
    const inStar = starTiles.some(t => t.x === p.x && t.y === p.y);
    const inBow = bowTiles.some(t => t.x === p.x && t.y === p.y);

    if (inPort) {
      const dmg = e.id === 'ironclad' ? 24 : 18;
      p.hp = Math.max(0, p.hp - dmg);
      state.history.push(`${e.name} fired Port Broadside into our hull for ${dmg} damage!`);
    } else if (inStar) {
      const dmg = e.id === 'ironclad' ? 24 : 18;
      p.hp = Math.max(0, p.hp - dmg);
      state.history.push(`${e.name} fired Starboard Broadside into our hull for ${dmg} damage!`);
    } else if (inBow) {
      const dmg = e.id === 'corvette' ? 16 : 14;
      p.hp = Math.max(0, p.hp - dmg);
      state.history.push(`${e.name} scored a direct Bow Chaser hit on our deck for ${dmg} damage!`);
    } else {
      // Maneuver AI: determine step towards player
      const dx = p.x - e.x;
      const dy = p.y - e.y;

      let preferredHeading = e.heading;
      if (Math.abs(dy) >= Math.abs(dx)) {
        preferredHeading = dy > 0 ? 'S' : 'N';
      } else {
        preferredHeading = dx > 0 ? 'E' : 'W';
      }

      if (e.heading !== preferredHeading) {
        // Rotate towards preferred heading
        const curIdx = DIRS.indexOf(e.heading);
        const prefIdx = DIRS.indexOf(preferredHeading);
        const diff = (prefIdx - curIdx + 4) % 4;
        if (diff === 1) e.heading = DIRS[(curIdx + 1) % 4];
        else e.heading = DIRS[(curIdx + 3) % 4];
      } else {
        // Advance 1 tile forward if space is clear
        const vec = VECTORS[e.heading];
        const nx = e.x + vec.dx;
        const ny = e.y + vec.dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          const occEnemy = state.enemies.some(oe => oe.alive && oe.id !== e.id && oe.x === nx && oe.y === ny);
          const occPlayer = p.x === nx && p.y === ny;
          if (!occEnemy && !occPlayer) {
            e.x = nx;
            e.y = ny;
          }
        }
      }
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
  const p = state.player;

  // Decrease cooldowns
  if (p.portCooldown > 0) p.portCooldown--;
  if (p.starboardCooldown > 0) p.starboardCooldown--;

  // Player Action Execution
  if (action === 'sail_ahead') {
    const vec = VECTORS[p.heading];
    const moves = (p.heading === state.wind) ? 2 : 1;
    let advanced = 0;

    for (let m = 0; m < moves; m++) {
      const nx = p.x + vec.dx;
      const ny = p.y + vec.dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        const occ = findEnemyAt(state, nx, ny);
        if (occ) {
          // Ramming collision
          occ.hp = Math.max(0, occ.hp - 25);
          p.hp = Math.max(0, p.hp - 15);
          state.history.push(`RAMMING SPEED! Collided with ${occ.name}! Both ships suffered structural trauma.`);
          if (occ.hp === 0) {
            occ.alive = false;
            reward += occ.points;
            state.history.push(`Enemy ${occ.name} broken in two and sunk!`);
          }
          break;
        } else {
          p.x = nx;
          p.y = ny;
          advanced++;
        }
      } else {
        break;
      }
    }
    state.history.push(`Engine Telegraph: Advanced ${advanced} nautical knot(s) heading ${p.heading}.`);
    reward += 2;
  } else if (action === 'rudder_port') {
    p.heading = getPortDir(p.heading);
    state.history.push(`Rudder Port: Bearing adjusted to ${p.heading}.`);
    reward += 1;
  } else if (action === 'rudder_starboard') {
    p.heading = getStarboardDir(p.heading);
    state.history.push(`Rudder Starboard: Bearing adjusted to ${p.heading}.`);
    reward += 1;
  } else if (action === 'fire_broadside_port') {
    p.portCooldown = 1;
    const fireDir = getPortDir(p.heading);
    const tiles = getTargetInBeam(p.x, p.y, fireDir, 3);
    let hit = false;

    tiles.forEach(t => {
      const target = findEnemyAt(state, t.x, t.y);
      if (target) {
        hit = true;
        let dmg = 32 - (t.dist - 1) * 4;
        // Crossing the T bonus: if target heading is perpendicular or facing us
        if (target.heading === p.heading || target.heading === VECTORS[p.heading]) {
          dmg += 12;
          state.history.push(`CROSSING THE T! Crushing rake into ${target.name}'s centerline!`);
        }
        target.hp = Math.max(0, target.hp - dmg);
        state.history.push(`PORT BROADSIDE struck ${target.name} for ${dmg} damage!`);
        reward += 15;
        if (target.hp === 0) {
          target.alive = false;
          reward += target.points;
          state.history.push(`Critical explosion! ${target.name} slipped beneath the waves!`);
        }
      }
    });
    if (!hit) {
      state.history.push('Port broadside volley splashed into empty sea.');
    }
  } else if (action === 'fire_broadside_starboard') {
    p.starboardCooldown = 1;
    const fireDir = getStarboardDir(p.heading);
    const tiles = getTargetInBeam(p.x, p.y, fireDir, 3);
    let hit = false;

    tiles.forEach(t => {
      const target = findEnemyAt(state, t.x, t.y);
      if (target) {
        hit = true;
        let dmg = 32 - (t.dist - 1) * 4;
        if (target.heading === p.heading) {
          dmg += 12;
          state.history.push(`CROSSING THE T! Raking broadside into ${target.name}!`);
        }
        target.hp = Math.max(0, target.hp - dmg);
        state.history.push(`STARBOARD BROADSIDE hammered ${target.name} for ${dmg} damage!`);
        reward += 15;
        if (target.hp === 0) {
          target.alive = false;
          reward += target.points;
          state.history.push(`Catastrophic magazine detonation! ${target.name} sunk!`);
        }
      }
    });
    if (!hit) {
      state.history.push('Starboard broadside volley churned empty water.');
    }
  } else if (action === 'fire_bow_chaser') {
    const tiles = getTargetInBeam(p.x, p.y, p.heading, 3);
    let hit = false;

    for (const t of tiles) {
      const target = findEnemyAt(state, t.x, t.y);
      if (target) {
        hit = true;
        const dmg = 20 - (t.dist - 1) * 3;
        target.hp = Math.max(0, target.hp - dmg);
        state.history.push(`Bow Chaser scored direct hit on ${target.name} for ${dmg} damage.`);
        reward += 10;
        if (target.hp === 0) {
          target.alive = false;
          reward += target.points;
          state.history.push(`${target.name} caught fire and foundered!`);
        }
        break; // Bow shot stops at first vessel
      }
    }
    if (!hit) {
      state.history.push('Bow chaser round overshot the horizon.');
    }
  } else if (action === 'damage_control') {
    p.repairsRemaining--;
    const heal = Math.min(24, p.maxHp - p.hp);
    p.hp += heal;
    state.history.push(`Damage Control: Shored bulkheads, pumped bilges (+${heal} Hull HP).`);
    reward += 8;
  }

  // Check victory before enemy phase
  const allSunk = state.enemies.every(e => !e.alive);
  if (allSunk) {
    state.done = true;
    state.winner = 'player';
    state.history.push('NAVAL TRIUMPH! Entire enemy flotilla sent to the ocean floor!');
    reward += 120;
    return { reward, done: true };
  }

  // Enemy Counter-Attack & Movement Phase
  processEnemyPhase(state);

  // Check player defeat
  if (p.hp <= 0) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('SHIP LOST: Flagship flooded and capsized. Flotilla destroyed.');
    reward -= 80;
    return { reward, done: true };
  }

  // Wind rotation every 6 turns
  if (state.turn % 6 === 0) {
    const curWIdx = DIRS.indexOf(state.wind);
    state.wind = DIRS[(curWIdx + 1) % 4];
    state.history.push(`The weathercock shifts: Prevailing wind now blowing ${state.wind}.`);
  }

  // Turn advance
  state.turn++;
  if (state.turn > state.maxTurns && !state.done) {
    state.done = true;
    state.winner = 'draw';
    state.history.push('STALEMATE: Night fell and remaining ships disengaged under smoke screen.');
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let sunkTonnage = 0;
  state.enemies.forEach(e => {
    if (!e.alive) sunkTonnage += e.points;
    else sunkTonnage += Math.floor((e.maxHp - e.hp) * 0.8);
  });

  const hullBonus = state.player.hp * 2;
  const turnBonus = Math.max(0, (state.maxTurns - state.turn) * 8);
  let total = sunkTonnage + hullBonus + turnBonus;

  if (state.winner === 'player') total += 150;
  return Math.max(0, total);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    GRID_SIZE,
    DIRS,
    VECTORS,
    getPortDir,
    getStarboardDir
  };
}