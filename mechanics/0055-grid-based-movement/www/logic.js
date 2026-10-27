// Pure deterministic logic for 0055: Grid-Based Movement (Crypt Step)

const WIDTH = 10;
const HEIGHT = 10;
const MAX_FLOORS = 3;
const MAX_STEPS_PER_FLOOR = 120;

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEMPLATES = [
  // Template 0: The Boulder Crossing
  // 10x10 layout
  [
    '##########',
    '#@..#....#',
    '#.B.#..G.#',
    '#...#W####',
    '#...#....#',
    '##P##.E..#',
    '#S..D....#',
    '#.K.#.B..#',
    '#...#W...#',
    '########X#'
  ],
  // Template 1: The Sentry Vault
  [
    '##########',
    '#@..#..K.#',
    '#.E.#.####',
    '#...#..G.#',
    '###D######',
    '#...B.W..#',
    '#.P.####.#',
    '#S..#..E.#',
    '#...#....#',
    '########X#'
  ],
  // Template 2: Pressure Courtyard
  [
    '##########',
    '#@..B.W..#',
    '#...####.#',
    '##.##..#.#',
    '#K.P#..#G#',
    '#S.##..D.#',
    '#..E#..#.#',
    '#.####.B.#',
    '#......W.#',
    '########X#'
  ],
  // Template 3: Crypt Labyrinth
  [
    '##########',
    '#@..#..G.#',
    '#B..#.####',
    '#W..#..K.#',
    '###.###D##',
    '#...#....#',
    '#.P.S..E.#',
    '#.B.######',
    '#.W......#',
    '########X#'
  ]
];

function parseTemplate(templateStrArr) {
  const grid = [];
  let player = { x: 1, y: 1 };
  let exit = { x: 8, y: 9 };
  const boulders = [];
  const keys = [];
  const gems = [];
  const sentries = [];
  const plates = [];
  const spikes = [];

  for (let y = 0; y < HEIGHT; y++) {
    const row = [];
    const line = templateStrArr[y];
    for (let x = 0; x < WIDTH; x++) {
      const char = line[x];
      if (char === '@') {
        player = { x, y };
        row.push('.');
      } else if (char === 'B') {
        boulders.push({ x, y });
        row.push('.');
      } else if (char === 'K') {
        keys.push({ x, y });
        row.push('.');
      } else if (char === 'G') {
        gems.push({ x, y });
        row.push('.');
      } else if (char === 'E') {
        sentries.push({ x, y, dx: 0, dy: 1 });
        row.push('.');
      } else if (char === 'P') {
        plates.push({ x, y });
        row.push('P');
      } else if (char === 'S') {
        spikes.push({ x, y });
        row.push('S');
      } else if (char === 'X') {
        exit = { x, y };
        row.push('X');
      } else if (char === 'D' || char === 'W' || char === '#') {
        row.push(char);
      } else {
        row.push('.');
      }
    }
    grid.push(row);
  }

  return { grid, player, exit, boulders, keys, gems, sentries, plates, spikes };
}

function initFloor(state, floorNum) {
  const tmplIndex = Math.abs((state.seed + floorNum - 1) % TEMPLATES.length);
  const parsed = parseTemplate(TEMPLATES[tmplIndex]);

  state.grid = parsed.grid;
  state.player = { ...parsed.player };
  state.exit = { ...parsed.exit };
  state.boulders = parsed.boulders.map(b => ({ ...b }));
  state.keysLocations = parsed.keys.map(k => ({ ...k }));
  state.gemsLocations = parsed.gems.map(g => ({ ...g }));
  state.sentries = parsed.sentries.map(s => ({ ...s }));
  state.plates = parsed.plates.map(p => ({ ...p }));
  state.spikes = parsed.spikes.map(s => ({ ...s }));
  state.floorSteps = 0;
  state.spikesActive = false;
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const state = {
    seed: safeSeed,
    floor: 1,
    maxFloors: MAX_FLOORS,
    hp: 3,
    maxHp: 3,
    keys: 0,
    keysCollected: 0,
    gems: 0,
    totalSteps: 0,
    floorSteps: 0,
    done: false,
    won: false,
    message: 'Welcome to the Crypt. Seek the exit stairs.'
  };

  initFloor(state, 1);
  return state;
}

function hasBoulder(state, x, y) {
  return state.boulders.some(b => b.x === x && b.y === y);
}

function hasSentry(state, x, y) {
  return state.sentries.some(s => s.x === x && s.y === y);
}

const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

function legalActions(state) {
  if (state.done) return [];

  const actions = ['wait'];
  const px = state.player.x;
  const py = state.player.y;

  for (const [actionName, delta] of Object.entries(DIRS)) {
    const tx = px + delta.dx;
    const ty = py + delta.dy;

    if (tx < 0 || tx >= WIDTH || ty < 0 || ty >= HEIGHT) continue;

    const cell = state.grid[ty][tx];
    if (cell === '#') continue;

    // Locked door check
    if (cell === 'D' && state.keys <= 0) continue;

    // Open pit check
    if (cell === 'W' && !hasBoulder(state, tx, ty)) {
      continue;
    }

    // Boulder push check
    if (hasBoulder(state, tx, ty)) {
      const bx = tx + delta.dx;
      const by = ty + delta.dy;
      if (bx < 0 || bx >= WIDTH || by < 0 || by >= HEIGHT) continue;
      const bCell = state.grid[by][bx];
      if (bCell === '#' || bCell === 'D') continue;
      if (hasBoulder(state, bx, by)) continue;
      if (hasSentry(state, bx, by)) continue;
      // Boulder can be pushed into floor or pit
    }

    actions.push(actionName);
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    return { reward: 0, done: true };
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  state.totalSteps++;
  state.floorSteps++;

  if (action !== 'wait') {
    const delta = DIRS[action];
    const tx = state.player.x + delta.dx;
    const ty = state.player.y + delta.dy;

    // Boulder push handling
    const bIndex = state.boulders.findIndex(b => b.x === tx && b.y === ty);
    if (bIndex !== -1) {
      const bx = tx + delta.dx;
      const by = ty + delta.dy;
      if (state.grid[by][bx] === 'W') {
        // Pit filled by boulder!
        state.grid[by][bx] = '.';
        state.boulders.splice(bIndex, 1);
        reward += 20;
        state.message = 'Boulder filled the pit chasm!';
      } else {
        state.boulders[bIndex].x = bx;
        state.boulders[bIndex].y = by;
        state.message = 'Pushed heavy boulder.';
      }
    }

    // Door unlock handling
    if (state.grid[ty][tx] === 'D') {
      state.grid[ty][tx] = '.';
      state.keys--;
      reward += 15;
      state.message = 'Unlocked iron door.';
    }

    // Move player
    state.player.x = tx;
    state.player.y = ty;

    // Collect key
    const kIndex = state.keysLocations.findIndex(k => k.x === tx && k.y === ty);
    if (kIndex !== -1) {
      state.keysLocations.splice(kIndex, 1);
      state.keys++;
      state.keysCollected++;
      reward += 15;
      state.message = 'Found a bronze key!';
    }

    // Collect gem
    const gIndex = state.gemsLocations.findIndex(g => g.x === tx && g.y === ty);
    if (gIndex !== -1) {
      state.gemsLocations.splice(gIndex, 1);
      state.gems++;
      reward += 25;
      state.message = 'Found a glowing gem!';
    }
  } else {
    state.message = 'Waiting cautiously...';
  }

  // Pressure plate & Spikes evaluation
  // If player or any boulder stands on plate, spikes are retracted
  let platePressed = false;
  for (const plate of state.plates) {
    if (state.player.x === plate.x && state.player.y === plate.y) {
      platePressed = true;
      break;
    }
    if (hasBoulder(state, plate.x, plate.y)) {
      platePressed = true;
      break;
    }
  }

  if (platePressed) {
    state.spikesActive = false;
  } else {
    // Spikes toggle every other step
    state.spikesActive = (state.floorSteps % 2 === 1);
  }

  // Check spike hazard on player
  if (state.spikesActive) {
    const onSpike = state.spikes.some(s => s.x === state.player.x && s.y === state.player.y);
    if (onSpike) {
      state.hp--;
      reward -= 20;
      state.message = 'Impaled by spikes! (-1 HP)';
    }
  }

  // Sentry patrol movement
  for (const sentry of state.sentries) {
    let nx = sentry.x + sentry.dx;
    let ny = sentry.y + sentry.dy;

    const blocked =
      nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT ||
      state.grid[ny][nx] === '#' ||
      state.grid[ny][nx] === 'D' ||
      state.grid[ny][nx] === 'W' ||
      hasBoulder(state, nx, ny);

    if (blocked) {
      sentry.dx = -sentry.dx;
      sentry.dy = -sentry.dy;
      nx = sentry.x + sentry.dx;
      ny = sentry.y + sentry.dy;
      const stillBlocked =
        nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT ||
        state.grid[ny][nx] === '#' ||
        state.grid[ny][nx] === 'D' ||
        state.grid[ny][nx] === 'W' ||
        hasBoulder(state, nx, ny);
      if (!stillBlocked) {
        sentry.x = nx;
        sentry.y = ny;
      }
    } else {
      sentry.x = nx;
      sentry.y = ny;
    }

    // Sentry collides with player
    if (sentry.x === state.player.x && sentry.y === state.player.y) {
      state.hp--;
      reward -= 30;
      state.message = 'Ambushed by crypt sentry! (-1 HP)';
    }
  }

  // Check floor exit
  if (state.player.x === state.exit.x && state.player.y === state.exit.y) {
    if (state.floor < state.maxFloors) {
      state.floor++;
      reward += 100;
      initFloor(state, state.floor);
      state.message = `Descended to Floor ${state.floor}!`;
    } else {
      state.won = true;
      state.done = true;
      reward += 300;
      state.message = 'Victory! Escaped the Crypt depths!';
    }
  }

  // Check defeat conditions
  if (state.hp <= 0) {
    state.done = true;
    reward -= 100;
    state.message = 'Defeat! Slain in the crypt dungeons.';
  } else if (state.floorSteps >= MAX_STEPS_PER_FLOOR) {
    state.done = true;
    reward -= 50;
    state.message = 'Exhaustion! Ran out of torchlight.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    (state.floor - 1) * 300 +
    state.gems * 50 +
    state.keysCollected * 20 +
    state.hp * 100 +
    (state.won ? 500 : 0) -
    state.totalSteps
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    WIDTH,
    HEIGHT,
    MAX_FLOORS
  };
}
