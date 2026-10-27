// Level solver contract for 0048-physics-puzzle (see docs/LEVELS.md):
//   validateLevel(data) -> array of problems, empty when well-formed
//   solve(data, { maxStates }) -> { solvable: true | false | null, moves, statesVisited }
//   replay(data, moves) -> true when moves solve the level

function validateLevel(data) {
  const problems = [];
  if (!data || typeof data !== 'object') {
    return ['data must be an object'];
  }
  if (!Number.isInteger(data.width) || data.width < 5 || data.width > 20) {
    problems.push('width must be an integer between 5 and 20');
  }
  if (!Number.isInteger(data.height) || data.height < 5 || data.height > 20) {
    problems.push('height must be an integer between 5 and 20');
  }
  if (!Number.isInteger(data.maxFuel) || data.maxFuel < 1 || data.maxFuel > 50) {
    problems.push('maxFuel must be an integer between 1 and 50');
  }
  if (!data.probe || typeof data.probe.x !== 'number' || typeof data.probe.y !== 'number') {
    problems.push('probe must be an object with integer x and y');
  }
  if (!data.goal || typeof data.goal.x !== 'number' || typeof data.goal.y !== 'number') {
    problems.push('goal must be an object with integer x and y');
  }
  if (!Array.isArray(data.beacons)) {
    problems.push('beacons must be an array');
  }
  if (!Array.isArray(data.wells)) {
    problems.push('wells must be an array');
  }
  if (!Array.isArray(data.asteroids)) {
    problems.push('asteroids must be an array');
  }
  return problems;
}

function simulateStep(level, state, actionChar) {
  let vx = state.vx;
  let vy = state.vy;
  let fuel = state.fuel;
  let collected = state.collected;
  let x = state.x;
  let y = state.y;

  if (actionChar === 'U') {
    if (fuel <= 0) return { ok: false, crashed: true };
    vy--; fuel--;
  } else if (actionChar === 'D') {
    if (fuel <= 0) return { ok: false, crashed: true };
    vy++; fuel--;
  } else if (actionChar === 'L') {
    if (fuel <= 0) return { ok: false, crashed: true };
    vx--; fuel--;
  } else if (actionChar === 'R') {
    if (fuel <= 0) return { ok: false, crashed: true };
    vx++; fuel--;
  } else if (actionChar === 'C') {
    // Coasting: no fuel cost
  } else {
    return { ok: false, crashed: true };
  }

  // Apply gravity wells
  for (const w of (level.wells || [])) {
    const dx = w.x - x;
    const dy = w.y - y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist <= (w.range || 2)) {
      if (dx > 0) vx++; else if (dx < 0) vx--;
      if (dy > 0) vy++; else if (dy < 0) vy--;
    }
  }

  vx = Math.max(-2, Math.min(2, vx));
  vy = Math.max(-2, Math.min(2, vy));

  if (vx === 0 && vy === 0) {
    return { ok: false, crashed: fuel <= 0, stranded: true, nextState: { x, y, vx, vy, fuel, collected } };
  }

  const sub = Math.max(Math.abs(vx), Math.abs(vy));
  const targetMask = (1 << level.beacons.length) - 1;
  let won = false;

  for (let s = 1; s <= sub; s++) {
    const ix = Math.round(x + (vx * s) / sub);
    const iy = Math.round(y + (vy * s) / sub);

    if (ix < 0 || ix >= level.width || iy < 0 || iy >= level.height) {
      return { ok: false, crashed: true };
    }
    for (const ast of (level.asteroids || [])) {
      if (ast.x === ix && ast.y === iy) return { ok: false, crashed: true };
    }
    for (const w of (level.wells || [])) {
      if (w.x === ix && w.y === iy) return { ok: false, crashed: true };
    }

    level.beacons.forEach((b, idx) => {
      if (b.x === ix && b.y === iy) collected |= (1 << idx);
    });

    if (collected === targetMask && ix === level.goal.x && iy === level.goal.y) {
      won = true;
      break;
    }
  }

  return {
    ok: true,
    won,
    nextState: {
      x: x + vx,
      y: y + vy,
      vx,
      vy,
      fuel,
      collected
    }
  };
}

function solve(data, options = {}) {
  const maxStates = options.maxStates || 100000;
  const queue = [{
    x: data.probe.x,
    y: data.probe.y,
    vx: 0,
    vy: 0,
    fuel: data.maxFuel,
    collected: 0,
    moves: ''
  }];

  const visited = new Set();
  const key = (s) => s.x + ',' + s.y + ',' + s.vx + ',' + s.vy + ',' + s.fuel + ',' + s.collected;
  visited.add(key(queue[0]));

  while (queue.length > 0) {
    if (visited.size > maxStates) {
      return { solvable: null, moves: '', statesVisited: visited.size };
    }

    const cur = queue.shift();
    const actions = [];
    if (cur.fuel > 0) actions.push('U', 'D', 'L', 'R');
    if (cur.vx !== 0 || cur.vy !== 0) actions.push('C');

    for (const a of actions) {
      const res = simulateStep(data, cur, a);
      if (!res.ok) continue;

      const nextMoves = cur.moves + a;
      if (res.won) {
        return { solvable: true, moves: nextMoves, statesVisited: visited.size };
      }

      const k = key(res.nextState);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({
          ...res.nextState,
          moves: nextMoves
        });
      }
    }
  }

  return { solvable: false, moves: '', statesVisited: visited.size };
}

function replay(data, moves) {
  let state = {
    x: data.probe.x,
    y: data.probe.y,
    vx: 0,
    vy: 0,
    fuel: data.maxFuel,
    collected: 0
  };

  for (let i = 0; i < moves.length; i++) {
    const res = simulateStep(data, state, moves[i]);
    if (!res.ok) return false;
    if (res.won && i === moves.length - 1) return true;
    state = res.nextState;
  }
  return false;
}

module.exports = {
  validateLevel,
  solve,
  replay,
  simulateStep
};
