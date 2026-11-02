// Level solver for 0101-tower-defense (see docs/LEVELS.md). It plays the real rules from www/logic.js.
const L = require('./www/logic.js');
const { encode, replayMoves, playPolicy } = require('../../tools/level_search.js');

const start = (data) => () => L.createState(1, data);

function validateLevel(data) {
  const fields = ['gold', 'hp', 'waves', 'creepHealth'];
  return fields.filter((k) => !(data && typeof data[k] === 'number' && data[k] > 0)).map((k) => k + ' must be a positive number');
}

const ORDERS = [
  ['cannon', 'ballista'],
  ['ballista', 'cannon'],
  ['frost', 'cannon'],
];
const SLOTS = [3, 1, 2, 4, 5, 0];

// A simple build plan is enough to prove a level can be won.
function solve(data) {
  for (const order of ORDERS) {
    const pick = (state, actions) => {
      for (const slot of SLOTS) {
        for (const type of order) {
          const i = actions.indexOf('build_' + type + '_' + slot);
          if (i >= 0) return i;
        }
      }
      const upgrade = actions.findIndex((a) => a.startsWith('upgrade_'));
      return upgrade >= 0 ? upgrade : 0;
    };
    const moves = playPolicy(L, start(data), pick);
    if (moves) return { solvable: true, moves, states: moves.length };
  }
  return { solvable: null, moves: null, states: 0 };
}

function replay(data, moves) {
  return replayMoves(L, start(data), moves);
}

module.exports = { validateLevel, solve, replay };
