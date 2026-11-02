const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

const solve = (s) => {
  // Fill a grid from the clues of a known picture: each run sits at a fixed place for these tests.
  s.clues = { rows: [[1], [], [], [], []], cols: [[1], [], [], [], []] };
};

test('clues are built from a picture', () => {
  const s = L.createState(1);
  assert.equal(s.clues.rows.length, 5);
  assert.equal(s.clues.cols.length, 5);
  assert.ok(s.clues.rows.flat().length > 0);
});

test('tapping fills a square and tapping again clears it', () => {
  const s = L.createState(1);
  L.step(s, 3);
  assert.equal(s.grid[3], 1);
  L.step(s, 3);
  assert.equal(s.grid[3], 0);
});

test('matching every clue wins', () => {
  const s = L.createState(1);
  solve(s);
  const res = L.step(s, 0);
  assert.equal(s.won, true);
  assert.equal(res.done, true);
  assert.equal(L.score(s), 990);
});

test('the game ends after 300 taps with no score', () => {
  const s = L.createState(1);
  for (let i = 0; i < 300; i++) L.step(s, 0);
  assert.equal(L.isOver(s), true);
  assert.equal(L.score(s), 0);
});

test('a square outside the grid is refused', () => {
  assert.throws(() => L.step(L.createState(1), 25), /illegal action/);
});
