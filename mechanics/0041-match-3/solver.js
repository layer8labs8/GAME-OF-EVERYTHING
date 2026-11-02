// Level solver for 0041-match-3 (see docs/LEVELS.md). It plays the real rules from www/logic.js.
const L = require('./www/logic.js');
const { encode, replayMoves, beamSearch } = require('../../tools/level_search.js');

const start = (data) => () => L.createState(1, data);

function validateLevel(data) {
  if (!data || !Array.isArray(data.board) || data.board.length !== L.CELLS) return ['board must have 36 gems'];
  const problems = [];
  if (L.findMatches(data.board).length) problems.push('the board must start with no match');
  if (!Number.isInteger(data.moves) || data.moves < 1) problems.push('moves must be positive');
  if (!Number.isInteger(data.target) || data.target < 1) problems.push('target must be positive');
  return problems;
}

function solve(data, options = {}) {
  const found = beamSearch(L, start(data), { width: options.width || 10, depth: data.moves, value: (s) => s.points });
  return found && found.won ? { solvable: true, moves: found.moves, states: found.moves.length } : { solvable: null, moves: null, states: 0, best: found };
}

function replay(data, moves) {
  return replayMoves(L, start(data), moves);
}

module.exports = { validateLevel, solve, replay };
