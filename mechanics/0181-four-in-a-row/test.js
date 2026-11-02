const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

const at = (r, c) => r * 7 + c;

test('a disc falls to the lowest free row', () => {
  const s = L.createState(1);
  L.step(s, 0);
  assert.equal(s.board[at(5, 0)], 1);
});

test('four across wins', () => {
  const s = L.createState(1);
  for (const c of [0, 1, 2]) s.board[at(5, c)] = 1;
  L.step(s, 3);
  assert.equal(s.winner, 'player');
  assert.equal(L.score(s), 100);
});

test('four on a diagonal wins', () => {
  const s = L.createState(1);
  s.board[at(5, 0)] = 1;
  s.board[at(4, 1)] = 1;
  s.board[at(3, 2)] = 1;
  for (const [r, c] of [[5, 1], [5, 2], [4, 2], [5, 3], [4, 3], [3, 3]]) s.board[at(r, c)] = 2;
  L.step(s, 3);
  assert.equal(s.winner, 'player');
});

test('the computer blocks three in a row', () => {
  const s = L.createState(1);
  for (const c of [0, 1]) s.board[at(5, c)] = 1;
  L.step(s, 2);
  assert.equal(s.board[at(5, 3)], 2);
});

test('a full column is not a legal move', () => {
  const s = L.createState(1);
  for (let r = 0; r < 6; r++) s.board[at(r, 4)] = r % 2 ? 1 : 2;
  assert.ok(!L.legalActions(s).includes(4));
  assert.throws(() => L.step(s, 4), /illegal action/);
});
