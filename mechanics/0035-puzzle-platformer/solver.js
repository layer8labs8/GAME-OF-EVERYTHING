// Level solver contract for 0035-puzzle-platformer (see docs/LEVELS.md):
//   validateLevel(data) -> array of problems, empty when well-formed
//   solve(data, { maxStates }) -> { solvable: true | false | null, moves, statesVisited }
//   replay(data, moves) -> true when moves solve the level

function parseMap(map) {
  let player = null;
  let exit = null;
  const crates = [];
  const switches = [];
  const doors = [];
  const walls = [];

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const ch = map[y][x];
      if (ch === '#') walls.push({ x, y });
      else if (ch === '@') player = { x, y };
      else if (ch === '$') crates.push({ x, y });
      else if (ch === '_') switches.push({ x, y });
      else if (ch === 'D') doors.push({ x, y });
      else if (ch === '!') exit = { x, y };
    }
  }
  return { width: map[0].length, height: map.length, walls, player, crates, switches, doors, exit };
}

function validateLevel(data) {
  const problems = [];
  if (!data || !Array.isArray(data.map) || data.map.length === 0) {
    return ['map must be a non-empty array of strings'];
  }
  const w = data.map[0].length;
  if (w < 3) problems.push('map width must be at least 3');
  if (data.map.length < 3) problems.push('map height must be at least 3');

  let playerCount = 0;
  let exitCount = 0;
  const validChars = new Set(['#', '.', '@', '$', '_', 'D', '!']);

  for (let y = 0; y < data.map.length; y++) {
    const row = data.map[y];
    if (typeof row !== 'string' || row.length !== w) {
      problems.push(`row ${y} has irregular length`);
      continue;
    }
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (!validChars.has(ch)) problems.push(`invalid character '${ch}' at (${x}, ${y})`);
      if (ch === '@') playerCount++;
      if (ch === '!') exitCount++;
    }
  }

  if (playerCount !== 1) problems.push(`expected exactly 1 player '@', found ${playerCount}`);
  if (exitCount < 1) problems.push(`expected at least 1 exit '!', found ${exitCount}`);

  return problems;
}

function simulate(level, state, action) {
  const width = level.width;
  const height = level.height;
  const walls = new Set(level.walls.map(w => `${w.x},${w.y}`));

  function isBlocked(x, y, cratesList) {
    if (x < 0 || x >= width || y < 0 || y >= height) return true;
    if (walls.has(`${x},${y}`)) return true;
    if (level.doors.some(d => d.x === x && d.y === y)) {
      const allSwitchesPressed = level.switches.length === 0 || level.switches.every(s => 
        cratesList.some(c => c.x === s.x && c.y === s.y) || (state.px === s.x && state.py === s.y)
      );
      if (!allSwitchesPressed) return true;
    }
    return false;
  }

  function applyGravity(px, py, cratesList) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of cratesList) {
        const belowY = c.y + 1;
        if (!isBlocked(c.x, belowY, cratesList) && !cratesList.some(o => o !== c && o.x === c.x && o.y === belowY)) {
          c.y++;
          changed = true;
        }
      }
    }
    while (true) {
      const belowY = py + 1;
      if (!isBlocked(px, belowY, cratesList) && !cratesList.some(c => c.x === px && c.y === belowY)) {
        py++;
      } else {
        break;
      }
    }
    return { px, py, crates: cratesList };
  }

  let px = state.px;
  let py = state.py;
  let crates = state.crates.map(c => ({ ...c }));

  const onGround = isBlocked(px, py + 1, crates) || crates.some(c => c.x === px && c.y === py + 1);

  if (action === 'L') {
    const tx = px - 1;
    const ty = py;
    const crateAtT = crates.find(c => c.x === tx && c.y === ty);
    if (crateAtT) {
      const pushX = tx - 1;
      const pushY = ty;
      if (!isBlocked(pushX, pushY, crates) && !crates.some(c => c.x === pushX && c.y === pushY)) {
        crateAtT.x = pushX;
        px = tx;
      } else {
        return null;
      }
    } else if (!isBlocked(tx, ty, crates)) {
      px = tx;
    } else {
      return null;
    }
  } else if (action === 'R') {
    const tx = px + 1;
    const ty = py;
    const crateAtT = crates.find(c => c.x === tx && c.y === ty);
    if (crateAtT) {
      const pushX = tx + 1;
      const pushY = ty;
      if (!isBlocked(pushX, pushY, crates) && !crates.some(c => c.x === pushX && c.y === pushY)) {
        crateAtT.x = pushX;
        px = tx;
      } else {
        return null;
      }
    } else if (!isBlocked(tx, ty, crates)) {
      px = tx;
    } else {
      return null;
    }
  } else if (action === 'K') { // Jump Right
    if (!onGround) return null;
    if (isBlocked(px, py - 1, crates) || crates.some(c => c.x === px && c.y === py - 1)) return null;
    const tx = px + 1;
    const ty = py - 1;
    if (isBlocked(tx, ty, crates) || crates.some(c => c.x === tx && c.y === ty)) return null;
    px = tx;
    py = ty;
  } else if (action === 'J') { // Jump Left
    if (!onGround) return null;
    if (isBlocked(px, py - 1, crates) || crates.some(c => c.x === px && c.y === py - 1)) return null;
    const tx = px - 1;
    const ty = py - 1;
    if (isBlocked(tx, ty, crates) || crates.some(c => c.x === tx && c.y === ty)) return null;
    px = tx;
    py = ty;
  } else {
    return null;
  }

  return applyGravity(px, py, crates);
}

function solve(data, options = {}) {
  const maxStates = options.maxStates || 100000;
  const level = parseMap(data.map);
  const startState = { px: level.player.x, py: level.player.y, crates: level.crates };

  function keyOf(s) {
    const cStr = s.crates.map(c => `${c.x},${c.y}`).sort().join(';');
    return `${s.px},${s.py}|${cStr}`;
  }

  const startKey = keyOf(startState);
  const queue = [{ state: startState, moves: '' }];
  const visited = new Set([startKey]);

  while (queue.length) {
    const { state, moves } = queue.shift();
    if (state.px === level.exit.x && state.py === level.exit.y) {
      return { solvable: true, moves, statesVisited: visited.size };
    }

    if (visited.size >= maxStates) {
      return { solvable: null, moves: null, statesVisited: visited.size };
    }

    for (const a of ['L', 'R', 'J', 'K']) {
      const next = simulate(level, state, a);
      if (!next) continue;
      const k = keyOf(next);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({ state: next, moves: moves + a });
      }
    }
  }
  return { solvable: false, moves: null, statesVisited: visited.size };
}

function replay(data, moves) {
  if (typeof moves !== 'string') return false;
  const level = parseMap(data.map);
  let state = { px: level.player.x, py: level.player.y, crates: level.crates };

  for (let i = 0; i < moves.length; i++) {
    const act = moves[i];
    state = simulate(level, state, act);
    if (!state) return false;
  }

  return state.px === level.exit.x && state.py === level.exit.y;
}

module.exports = {
  parseMap,
  validateLevel,
  simulate,
  solve,
  replay
};
