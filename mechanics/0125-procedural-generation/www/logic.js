// Logic for 0125-procedural-generation: Genesis Engine
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const GRID_SIZE = 10;
const MAX_TURNS = 250;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

function randInt(state, min, max) {
  return min + Math.floor(nextRng(state) * (max - min + 1));
}

const DIR_OFFSETS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

function initEmptyGrid(fillChar = '#') {
  const g = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    g.push(new Array(GRID_SIZE).fill(fillChar));
  }
  return g;
}

function generateBSPDungeon(state) {
  // Sector 1: Binary Space Partitioning style rooms
  const map = initEmptyGrid('#');

  // Room 1 (Top Left)
  for (let y = 1; y <= 4; y++) {
    for (let x = 1; x <= 4; x++) {
      map[y][x] = '.';
    }
  }

  // Room 2 (Bottom Right)
  for (let y = 5; y <= 8; y++) {
    for (let x = 5; x <= 8; x++) {
      map[y][x] = '.';
    }
  }

  // Room 3 (Top Right)
  for (let y = 1; y <= 3; y++) {
    for (let x = 6; x <= 8; x++) {
      map[y][x] = '.';
    }
  }

  // Corridors connecting rooms
  for (let x = 4; x <= 6; x++) map[2][x] = '.';
  for (let y = 2; y <= 6; y++) map[y][6] = '.';
  for (let x = 6; x >= 4; x--) map[6][x] = '.';
  for (let y = 4; y <= 6; y++) map[y][4] = '.';

  // Exit & Entities
  map[8][8] = 'E';
  map[2][7] = 'K'; // Keystone 1
  map[6][2] = 'F'; // Flux

  return map;
}

function generateCellularCaves(state) {
  // Sector 2: Cellular Automata smoothing
  let grid = initEmptyGrid('#');

  // Random initialization with 45% floor
  for (let y = 1; y < GRID_SIZE - 1; y++) {
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      grid[y][x] = nextRng(state) > 0.45 ? '.' : '#';
    }
  }

  // 2 smoothing steps
  for (let step = 0; step < 2; step++) {
    const next = initEmptyGrid('#');
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        let wallCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (grid[y + dy][x + dx] === '#') wallCount++;
          }
        }
        next[y][x] = wallCount >= 5 ? '#' : '.';
      }
    }
    grid = next;
  }

  // Guarantee corridor path from start (1, 1) to exit (8, 8)
  let cx = 1;
  let cy = 1;
  grid[cy][cx] = '.';
  while (cx < 8 || cy < 8) {
    if (cx < 8 && (cy === 8 || nextRng(state) > 0.5)) {
      cx++;
    } else if (cy < 8) {
      cy++;
    }
    grid[cy][cx] = '.';
  }

  grid[8][8] = 'E';
  grid[2][6] = 'K'; // Keystone 2
  grid[7][2] = 'F';

  return grid;
}

function generateDrunkardCatacombs(state) {
  // Sector 3: Random Walk Catacombs
  const map = initEmptyGrid('#');

  let wx = 1;
  let wy = 1;
  map[wy][wx] = '.';
  let floorCount = 1;

  while (floorCount < 48) {
    const d = ['up', 'down', 'left', 'right'][randInt(state, 0, 3)];
    const off = DIR_OFFSETS[d];
    const nx = wx + off.dx;
    const ny = wy + off.dy;

    if (nx >= 1 && nx <= 8 && ny >= 1 && ny <= 8) {
      wx = nx;
      wy = ny;
      if (map[wy][wx] === '#') {
        map[wy][wx] = '.';
        floorCount++;
      }
    }
  }

  // Guarantee exit path
  map[8][8] = 'E';
  map[7][8] = '.';
  map[8][7] = '.';

  map[3][7] = 'K'; // Keystone 3
  map[5][2] = 'F';

  return map;
}

function generateGenesisCore(state) {
  // Sector 4: Concentric Singularity Core
  const map = initEmptyGrid('#');

  // Outer ring
  for (let x = 1; x <= 8; x++) {
    map[1][x] = '.';
    map[8][x] = '.';
    map[x][1] = '.';
    map[x][8] = '.';
  }

  // Cross conduits
  for (let i = 2; i <= 7; i++) {
    map[4][i] = '.';
    map[5][i] = '.';
    map[i][4] = '.';
    map[i][5] = '.';
  }

  // Center Singularity Core
  map[4][4] = 'E';
  map[5][5] = 'E';
  map[2][2] = 'F';
  map[7][7] = 'F';

  return map;
}

function generateSectorMap(state, sector) {
  if (sector === 1) return generateBSPDungeon(state);
  if (sector === 2) return generateCellularCaves(state);
  if (sector === 3) return generateDrunkardCatacombs(state);
  return generateGenesisCore(state);
}

function spawnSectorEnemies(state, sector) {
  const enemies = [];
  if (sector === 1) {
    enemies.push({ id: 'a1', name: 'Glitch Sprite', type: 'sprite', x: 3, y: 3, hp: 16, maxHp: 16, atk: 6 });
    enemies.push({ id: 'a2', name: 'Glitch Sprite', type: 'sprite', x: 6, y: 7, hp: 16, maxHp: 16, atk: 6 });
  } else if (sector === 2) {
    enemies.push({ id: 'g1', name: 'Cave Stalker', type: 'stalker', x: 4, y: 4, hp: 25, maxHp: 25, atk: 9 });
    enemies.push({ id: 'g2', name: 'Cave Stalker', type: 'stalker', x: 7, y: 6, hp: 25, maxHp: 25, atk: 9 });
  } else if (sector === 3) {
    enemies.push({ id: 'v1', name: 'Void Sentinel', type: 'sentinel', x: 5, y: 3, hp: 35, maxHp: 35, atk: 12 });
    enemies.push({ id: 'v2', name: 'Void Sentinel', type: 'sentinel', x: 3, y: 7, hp: 35, maxHp: 35, atk: 12 });
  } else {
    // Sector 4: Singularity Core Guardian
    enemies.push({ id: 'boss', name: 'The Architect', type: 'boss', x: 5, y: 4, hp: 70, maxHp: 70, atk: 16 });
    enemies.push({ id: 'v3', name: 'Void Sentinel', type: 'sentinel', x: 2, y: 7, hp: 30, maxHp: 30, atk: 10 });
  }
  state.enemies = enemies;
}

function computeFOV(state) {
  const visible = initEmptyGrid(false);
  const px = state.player.x;
  const py = state.player.y;
  visible[py][px] = true;
  state.explored[py][px] = true;

  const radius = 3;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distSq = dx * dx + dy * dy;
      if (distSq <= radius * radius) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          visible[ny][nx] = true;
          state.explored[ny][nx] = true;
        }
      }
    }
  }
  state.visible = visible;
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 5512903;

  const player = {
    x: 1,
    y: 1,
    hp: 60,
    maxHp: 60,
    flux: 40,
    maxFlux: 100,
    keystones: 0
  };

  const state = {
    seed,
    rngState: rngVal,
    sector: 1,
    maxSectors: 4,
    turns: 0,
    maxTurns: MAX_TURNS,
    score: 0,
    done: false,
    victory: false,
    player,
    map: [],
    visible: [],
    explored: initEmptyGrid(false),
    enemies: [],
    combatLog: ['Genesis Engine online. Traversing procedural dimension Sector 1.']
  };

  state.map = generateSectorMap(state, 1);
  spawnSectorEnemies(state, 1);
  computeFOV(state);

  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const p = state.player;
  const dirs = ['up', 'down', 'left', 'right'];

  // Movement & Bump Attack
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    const off = DIR_OFFSETS[d];
    const nx = p.x + off.dx;
    const ny = p.y + off.dy;

    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      if (state.map[ny][nx] !== '#') {
        actions.push(`move:${d}`);
      }
    }
  }

  // Catalysts: Erode adjacent wall (costs 10 flux)
  if (p.flux >= 10) {
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const off = DIR_OFFSETS[d];
      const nx = p.x + off.dx;
      const ny = p.y + off.dy;
      // Do not allow breaking border bounding box (0 or 9)
      if (nx > 0 && nx < GRID_SIZE - 1 && ny > 0 && ny < GRID_SIZE - 1) {
        if (state.map[ny][nx] === '#') {
          actions.push(`erode:${d}`);
        }
      }
    }
  }

  // Catalysts: Solidify adjacent floor into wall (costs 10 flux)
  if (p.flux >= 10) {
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const off = DIR_OFFSETS[d];
      const nx = p.x + off.dx;
      const ny = p.y + off.dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (state.map[ny][nx] === '.' && !state.enemies.some(e => e.x === nx && e.y === ny && e.hp > 0)) {
          actions.push(`solidify:${d}`);
        }
      }
    }
  }

  // Catalysts: Resonance Pulse (costs 5 flux)
  if (p.flux >= 5) {
    actions.push('pulse');
  }

  // Activate Exit Portal
  const curTile = state.map[p.y][p.x];
  if (curTile === 'E') {
    actions.push('activate');
  }

  // Rest turn (recuperates 5 flux)
  actions.push('wait');

  return actions;
}

function resolvePlayerTurn(state, action) {
  const p = state.player;

  if (action.startsWith('move:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid move action: ${action}`);

    const nx = p.x + off.dx;
    const ny = p.y + off.dy;

    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || state.map[ny][nx] === '#') {
      throw new Error(`Invalid move destination: ${action}`);
    }

    // Check enemy bump attack
    const enemy = state.enemies.find(e => e.x === nx && e.y === ny && e.hp > 0);
    if (enemy) {
      const dmg = 12;
      enemy.hp -= dmg;
      state.score += dmg * 4;
      state.combatLog.push(`You discharge quantum resonance on ${enemy.name} for ${dmg} damage.`);
      if (enemy.hp <= 0) {
        state.score += 60;
        state.combatLog.push(`Dissolved ${enemy.name}!`);
      }
    } else {
      p.x = nx;
      p.y = ny;

      // Check item tile interactions
      const tile = state.map[ny][nx];
      if (tile === 'K') {
        p.keystones += 1;
        state.score += 400;
        state.map[ny][nx] = '.';
        state.combatLog.push(`Extracted Fractal Keystone! (${p.keystones}/3 collected)`);
      } else if (tile === 'F') {
        p.flux = Math.min(p.maxFlux, p.flux + 30);
        state.score += 50;
        state.map[ny][nx] = '.';
        state.combatLog.push('Absorbed Quantum Flux node (+30 Flux).');
      }
    }
  } else if (action.startsWith('erode:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid erode: ${action}`);
    const nx = p.x + off.dx;
    const ny = p.y + off.dy;
    if (state.map[ny][nx] !== '#') throw new Error('Target is not a wall');

    p.flux -= 10;
    state.map[ny][nx] = '.';
    state.score += 15;
    state.combatLog.push('Cellular Erosion: Dissolved barrier into open floor.');
  } else if (action.startsWith('solidify:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid solidify: ${action}`);
    const nx = p.x + off.dx;
    const ny = p.y + off.dy;
    if (state.map[ny][nx] !== '.') throw new Error('Target is not floor');

    p.flux -= 10;
    state.map[ny][nx] = '#';
    state.score += 10;
    state.combatLog.push('Material Synthesis: Constructed crystalline wall barrier.');
  } else if (action === 'pulse') {
    p.flux -= 5;
    const radius = 4;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = p.x + dx;
        const ny = p.y + dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          state.explored[ny][nx] = true;
          state.visible[ny][nx] = true;
        }
      }
    }
    state.score += 10;
    state.combatLog.push('Resonance Pulse revealed surrounding dimensional topology.');
  } else if (action === 'activate') {
    if (state.map[p.y][p.x] !== 'E') throw new Error('Not on exit portal');

    if (state.sector < state.maxSectors) {
      state.sector += 1;
      state.score += 350;
      p.x = 1;
      p.y = 1;

      state.explored = initEmptyGrid(false);
      state.map = generateSectorMap(state, state.sector);
      spawnSectorEnemies(state, state.sector);
      state.combatLog.push(`Traversed portal into Sector ${state.sector}!`);
    } else {
      // Sector 4 Singularity Core Stabilization
      state.done = true;
      state.victory = true;
      state.score += 3000 + p.keystones * 500;
      state.combatLog.push('TRIUMPH! Genesis Engine stabilized with Fractal Keystones!');
    }
  } else if (action === 'wait') {
    p.flux = Math.min(p.maxFlux, p.flux + 5);
    state.combatLog.push('Recalibrating quantum flux (+5 Flux).');
  } else {
    throw new Error(`Unknown action: ${action}`);
  }
}

function updateEnemies(state) {
  const p = state.player;

  for (const e of state.enemies) {
    if (e.hp <= 0) continue;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (dist === 1) {
      // Attack player
      p.hp = Math.max(0, p.hp - e.atk);
      state.combatLog.push(`${e.name} discharges glitch interference for ${e.atk} damage.`);
    } else if (dist <= 4) {
      // Step towards player
      let sx = 0;
      let sy = 0;
      if (Math.abs(dx) >= Math.abs(dy)) {
        sx = dx > 0 ? 1 : -1;
      } else {
        sy = dy > 0 ? 1 : -1;
      }

      const nx = e.x + sx;
      const ny = e.y + sy;

      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && state.map[ny][nx] !== '#') {
        const blockedByOther = state.enemies.some(o => o !== e && o.hp > 0 && o.x === nx && o.y === ny);
        const blockedByPlayer = (nx === p.x && ny === p.y);
        if (!blockedByOther && !blockedByPlayer) {
          e.x = nx;
          e.y = ny;
        }
      }
    }
  }
}

function checkGameEnd(state) {
  if (state.player.hp <= 0) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Architectural cohesion lost in the algorithmic void.');
    return;
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Dimensional distortion collapsed. Timeframe expired.');
  }
}

function step(state, action) {
  const legals = legalActions(state);
  if (!legals.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  state.turns += 1;

  // 1. Resolve player action
  resolvePlayerTurn(state, action);

  // 2. Enemies act
  updateEnemies(state);

  // 3. Update FOV
  computeFOV(state);

  // 4. Check outcome
  checkGameEnd(state);

  const reward = state.done ? (state.victory ? 1.0 : 0.0) : 0.0;
  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
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
