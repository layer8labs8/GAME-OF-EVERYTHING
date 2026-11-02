const test = require('node:test');
const assert = require('node:assert/strict');
const { encode, decode, replayMoves, playPolicy, beamSearch } = require('./level_search.js');

// A tiny game: reach 3 by adding 1 or 2, in at most 4 steps.
const L = {
  legalActions: (s) => (L.isOver(s) ? [] : [1, 2]),
  step: (s, a) => { s.n += a; s.steps += 1; },
  isOver: (s) => s.n >= 3 || s.steps >= 4,
  isWon: (s) => s.n === 3,
};
const start = () => ({ n: 0, steps: 0 });

test('moves round-trip through one character each', () => {
  for (const i of [0, 1, 7, 80]) assert.equal(decode(encode(i)), i);
});

test('replayMoves accepts a win and refuses a loss or a bad index', () => {
  assert.equal(replayMoves(L, start, encode(0) + encode(1)), true);
  assert.equal(replayMoves(L, start, encode(1) + encode(1)), false);
  assert.equal(replayMoves(L, start, encode(9)), false);
});

test('playPolicy returns the moves only when the policy wins', () => {
  assert.equal(playPolicy(L, start, () => 0).length, 3);
  assert.equal(playPolicy(L, start, () => 1), null);
});

test('beamSearch finds a win and marks it', () => {
  const found = beamSearch(L, start, { width: 2, depth: 4, value: (s) => s.n });
  assert.equal(found.won, true);
  assert.equal(replayMoves(L, start, found.moves), true);
});
