// Level contract for 0064-sliding-puzzle (see docs/LEVELS.md):
//   validateLevel(data) -> array of problems, empty when well-formed
//   solve(data, { maxStates }) -> { solvable: true | false | null, moves, states }
//   replay(data, moves) -> true when moves solve the level
const { GOAL, DIRECTIONS, moveGap, isSolved, play, inversions } = require('./www/logic.js');

function validateLevel(data) {
  const errors = [];
  if (!data || !Array.isArray(data.tiles)) {
    return ['tiles must be an array of 9 numbers'];
  }
  const tiles = data.tiles;
  if (tiles.length !== 9) errors.push(`tiles must have length 9, found ${tiles.length}`);
  const sorted = tiles.slice().sort((a, b) => a - b);
  const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const validDigits = sorted.every((v, i) => v === expected[i]);
  if (!validDigits) errors.push('tiles must contain digits 0 through 8 exactly once');
  if (validDigits && inversions(tiles) % 2 !== 0) {
    errors.push('tiles configuration has odd inversions and is mathematically unsolvable');
  }
  return errors;
}

function solve(data, options = {}) {
  const maxStates = options.maxStates || 400000;
  const start = data.tiles;
  const goalKey = GOAL.join(',');
  const startKey = start.join(',');
  if (startKey === goalKey) return { solvable: true, moves: '', states: 1 };

  const parent = new Map([[startKey, null]]);
  let frontier = [start];
  let states = 1;

  while (frontier.length) {
    const nextFrontier = [];
    for (const t of frontier) {
      const pk = t.join(',');
      for (const d of DIRECTIONS) {
        const n = moveGap(t, d);
        if (n === t) continue;
        const nk = n.join(',');
        if (parent.has(nk)) continue;
        parent.set(nk, { from: pk, move: d });
        states += 1;
        if (nk === goalKey) {
          const moves = [];
          for (let step = parent.get(nk); step; step = parent.get(step.from)) {
            moves.push(step.move);
          }
          return { solvable: true, moves: moves.reverse().join(''), states };
        }
        if (states >= maxStates) return { solvable: null, moves: null, states };
        nextFrontier.push(n);
      }
    }
    frontier = nextFrontier;
  }
  return { solvable: false, moves: null, states };
}

function replay(data, moves) {
  if (typeof moves !== 'string') return false;
  const finalBoard = play(data.tiles, moves);
  return isSolved(finalBoard);
}

module.exports = { validateLevel, solve, replay };
