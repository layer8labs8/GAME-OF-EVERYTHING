// Level solver contract for 0048-physics-puzzle (see docs/LEVELS.md):
//   validateLevel(data) -> array of problems, empty when well-formed
//   solve(data, { maxStates }) -> { solvable: true | false | null, moves, states }
//   replay(data, moves) -> true when moves solve the level
// The search runs the real game rules from www/logic.js, so a rule change cannot silently break the levels.
const L = require('./www/logic.js');

const ACTIONS = { U: 'thrust_up', D: 'thrust_down', L: 'thrust_left', R: 'thrust_right', C: 'coast' };

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

function keyOf(s) {
  return [s.probe.x, s.probe.y, s.vx, s.vy, s.fuel, s.collectedMask].join(',');
}

function solve(data, options = {}) {
  const maxStates = options.maxStates || 100000;
  const start = L.createState(1, 0, data);
  const queue = [{ state: start, moves: '' }];
  const visited = new Set([keyOf(start)]);

  for (let head = 0; head < queue.length; head++) {
    const { state, moves } = queue[head];
    if (visited.size > maxStates) return { solvable: null, moves: null, states: visited.size };
    const legal = L.legalActions(state);
    for (const [letter, action] of Object.entries(ACTIONS)) {
      if (!legal.includes(action)) continue;
      const next = JSON.parse(JSON.stringify(state));
      L.step(next, action);
      const path = moves + letter;
      if (next.won) return { solvable: true, moves: path, states: visited.size };
      const key = keyOf(next);
      if (!next.lost && !visited.has(key)) {
        visited.add(key);
        queue.push({ state: next, moves: path });
      }
    }
  }
  return { solvable: false, moves: null, states: visited.size };
}

function replay(data, moves) {
  if (typeof moves !== 'string') return false;
  const state = L.createState(1, 0, data);
  for (const letter of moves) {
    const action = ACTIONS[letter];
    if (!action || !L.legalActions(state).includes(action)) return false;
    L.step(state, action);
  }
  return state.won;
}

module.exports = { validateLevel, solve, replay };
