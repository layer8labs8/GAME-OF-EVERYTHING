// Level solver for 0030-bubble-shooter (see docs/LEVELS.md). It plays the real rules from www/logic.js.
const L = require('./www/logic.js');
const { encode, replayMoves, beamSearch } = require('../../tools/level_search.js');

const start = (data) => () => L.createState(1, data);

function validateLevel(data) {
  if (!data || !Array.isArray(data.grid) || data.grid.length !== L.CELLS) return ['grid must have 80 cells'];
  const problems = [];
  if (!data.grid.some(Boolean)) problems.push('the grid needs orbs');
  if (!Number.isInteger(data.shots) || data.shots < 1) problems.push('shots must be positive');
  if (!Number.isInteger(data.dropEvery) || data.dropEvery < 1) problems.push('dropEvery must be positive');
  return problems;
}

const orbsLeft = (s) => s.grid.filter(Boolean).length;

function solve(data, options = {}) {
  const found = beamSearch(L, start(data), { width: options.width || 12, depth: data.shots, value: (s) => -orbsLeft(s) * 100 + s.points / 100 });
  return found && found.won ? { solvable: true, moves: found.moves, states: found.moves.length } : { solvable: null, moves: null, states: 0 };
}

function replay(data, moves) {
  return replayMoves(L, start(data), moves);
}

module.exports = { validateLevel, solve, replay };
