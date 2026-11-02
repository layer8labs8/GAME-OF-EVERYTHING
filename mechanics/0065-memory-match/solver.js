// Level solver for 0065-memory-match (see docs/LEVELS.md). It plays the real rules from www/logic.js.
const L = require('./www/logic.js');
const { encode, replayMoves } = require('../../tools/level_search.js');

const start = (data) => () => L.createState(1, data);

function validateLevel(data) {
  if (!data || !Array.isArray(data.deck) || data.deck.length !== 16) return ['deck must list 16 cards'];
  const counts = {};
  for (const v of data.deck) counts[v] = (counts[v] || 0) + 1;
  const problems = Object.values(counts).every((n) => n === 2) ? [] : ['every symbol must appear exactly twice'];
  if (!Number.isInteger(data.turns) || data.turns < 8) problems.push('turns must be at least 8');
  return problems;
}

// Perfect memory: flip each pair in turn. This proves the turn limit can be met.
function solve(data) {
  const state = start(data)();
  let moves = '';
  for (let symbol = 0; symbol < 8; symbol++) {
    for (let i = 0; i < 16; i++) {
      if (data.deck[i] !== symbol) continue;
      const actions = L.legalActions(state);
      if (!actions.includes(i)) return { solvable: false, moves: null, states: moves.length };
      moves += encode(actions.indexOf(i));
      L.step(state, i);
    }
  }
  return L.isWon(state) ? { solvable: true, moves, states: moves.length } : { solvable: false, moves: null, states: moves.length };
}

function replay(data, moves) {
  return replayMoves(L, start(data), moves);
}

module.exports = { validateLevel, solve, replay };
