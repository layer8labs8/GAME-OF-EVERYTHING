// Level solver contract for 0035-puzzle-platformer (see docs/LEVELS.md):
//   validateLevel(data) -> array of problems, empty when well-formed
//   solve(data, { maxStates }) -> { solvable: true | false | null, moves, states }
//   replay(data, moves) -> true when moves solve the level
// The search runs the real game rules from www/logic.js, so a rule change cannot silently break the levels.
const L = require('./www/logic.js');

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

function keyOf(state) {
  const crates = state.crates.map((c) => `${c.x},${c.y}`).sort().join(';');
  return `${state.player.x},${state.player.y}|${crates}`;
}

function solve(data, options = {}) {
  const maxStates = options.maxStates || 100000;
  const start = L.createState(1, { levelData: data });
  const queue = [{ state: start, moves: '' }];
  const visited = new Set([keyOf(start)]);

  for (let head = 0; head < queue.length; head++) {
    const { state, moves } = queue[head];
    if (visited.size >= maxStates) return { solvable: null, moves: null, states: visited.size };
    for (const action of L.legalActions(state)) {
      const next = JSON.parse(JSON.stringify(state));
      L.step(next, action);
      const path = moves + action;
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
  const state = L.createState(1, { levelData: data });
  for (const action of moves) {
    if (!L.legalActions(state).includes(action)) return false;
    L.step(state, action);
  }
  return state.won;
}

module.exports = { validateLevel, solve, replay };
