const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('a move places a stone and the computer answers', () => {
  const s = L.createState(1);
  L.step(s, 0);
  assert.equal(s.board[0], 1);
  assert.equal(s.board.filter((v) => v === 2).length, 1);
});

test('three in a row wins for the player', () => {
  const s = L.createState(1);
  s.board = [1, 1, 0, 2, 2, 0, 0, 0, 0];
  const res = L.step(s, 2);
  assert.equal(s.winner, 'player');
  assert.deepEqual(res, { reward: 100, done: true });
});

test('the computer takes a win before anything else', () => {
  const s = L.createState(1);
  s.board = [2, 2, 0, 1, 0, 0, 1, 0, 0];
  L.step(s, 4);
  assert.equal(s.winner, 'computer');
  assert.equal(s.board[2], 2);
});

test('the computer blocks an open line', () => {
  const s = L.createState(1);
  s.board = [1, 0, 0, 0, 2, 0, 0, 0, 0];
  L.step(s, 1);
  assert.equal(s.board[2], 2);
});

test('a full board with no line is a draw', () => {
  const s = L.createState(1);
  s.board = [1, 2, 1, 1, 2, 2, 2, 1, 0];
  L.step(s, 8);
  assert.equal(s.winner, 'draw');
  assert.equal(L.score(s), 50);
});

test('used cells and finished games refuse moves', () => {
  const s = L.createState(1);
  L.step(s, 0);
  assert.throws(() => L.step(s, 0), /illegal action/);
  s.winner = 'draw';
  assert.deepEqual(L.legalActions(s), []);
});
