// Level solver for 0068-sudoku (see docs/LEVELS.md). It plays the real rules from www/logic.js.
const L = require('./www/logic.js');
const { encode, replayMoves } = require('../../tools/level_search.js');

const start = (data) => () => L.createState(1, data);

function validateLevel(data) {
  const g = data && data.givens;
  if (!Array.isArray(g) || g.length !== 16 || !g.every((v) => Number.isInteger(v) && v >= 0 && v <= 4)) return ['givens must be 16 digits from 0 to 4'];
  return L.countSolutions(g.slice(), 2) === 1 ? [] : ['the puzzle must have exactly one solution'];
}

function solve(data) {
  const state = start(data)();
  let moves = '';
  while (!L.isOver(state)) {
    const actions = L.legalActions(state);
    const index = actions.findIndex((a) => a.digit === state.solution[a.cell]);
    moves += encode(index);
    L.step(state, actions[index]);
  }
  return L.isWon(state) ? { solvable: true, moves, states: moves.length } : { solvable: false, moves: null, states: moves.length };
}

function replay(data, moves) {
  return replayMoves(L, start(data), moves);
}

module.exports = { validateLevel, solve, replay };
