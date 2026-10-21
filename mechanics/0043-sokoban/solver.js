// Level contract for this mechanic (see docs/LEVELS.md):
//   validateLevel(data) -> array of problems, empty when the level is well formed
//   solve(data, { maxStates }) -> { solvable: true | false | null, moves, states }
//   replay(data, moves) -> true when the moves solve the level
// The solver is a breadth-first search over the real game rules (logic.js), so the
// solution it returns is a shortest one, counted in moves.
const { move, isSolved, play } = require('./www/logic.js');

const DIRECTIONS = ['U', 'D', 'L', 'R'];
const ALLOWED = '# @$.*+';

function isEnclosed(grid) {
  const h = grid.length;
  const w = grid[0].length;
  let start = null;
  grid.forEach((row, r) => {
    const c = row.search(/[@+]/);
    if (c >= 0) start = [r, c];
  });
  const seen = new Set([start.join(',')]);
  const stack = [start];
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= h || nc < 0 || nc >= w) return false;
      if (grid[nr][nc] === '#' || seen.has(`${nr},${nc}`)) continue;
      seen.add(`${nr},${nc}`);
      stack.push([nr, nc]);
    }
  }
  return true;
}

function validateLevel(data) {
  const grid = data && data.grid;
  if (!Array.isArray(grid) || grid.length === 0 || !grid.every((row) => typeof row === 'string')) {
    return ['grid must be a non-empty array of strings'];
  }
  const errors = [];
  if (!grid.every((row) => row.length === grid[0].length)) errors.push('rows must have equal length');
  const chars = [...grid.join('')];
  const count = (set) => chars.filter((ch) => set.includes(ch)).length;
  const unknown = [...new Set(chars.filter((ch) => !ALLOWED.includes(ch)))];
  if (unknown.length) errors.push(`unknown characters: ${unknown.join('')}`);
  const players = count('@+');
  if (players !== 1) errors.push(`needs exactly one player, found ${players}`);
  const crates = count('$*');
  const targets = count('.*+');
  if (crates === 0) errors.push('needs at least one crate');
  if (crates !== targets) errors.push(`crates (${crates}) and targets (${targets}) must match`);
  if (errors.length === 0 && !isEnclosed(grid)) errors.push('level is not enclosed by walls');
  return errors;
}

function pathTo(parent, key) {
  const moves = [];
  for (let step = parent.get(key); step; step = parent.get(step.from)) moves.push(step.move);
  return moves.reverse().join('');
}

function solve(data, options = {}) {
  const maxStates = options.maxStates || 400000;
  const key = (g) => g.join('|');
  const start = data.grid;
  if (isSolved(start)) return { solvable: true, moves: '', states: 1 };

  const parent = new Map([[key(start), null]]);
  let frontier = [start];
  let states = 1;
  while (frontier.length) {
    const next = [];
    for (const g of frontier) {
      const gk = key(g);
      for (const dir of DIRECTIONS) {
        const n = move(g, dir);
        const nk = key(n);
        if (nk === gk || parent.has(nk)) continue;
        parent.set(nk, { from: gk, move: dir });
        states += 1;
        if (isSolved(n)) return { solvable: true, moves: pathTo(parent, nk), states };
        if (states >= maxStates) return { solvable: null, moves: null, states };
        next.push(n);
      }
    }
    frontier = next;
  }
  return { solvable: false, moves: null, states };
}

function replay(data, moves) {
  return isSolved(play(data.grid, moves));
}

module.exports = { validateLevel, solve, replay };
