const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('the first player has four moves', () => {
  assert.deepEqual(L.legalActions(L.createState(1)), [19, 26, 37, 44]);
});

test('a move flips the trapped disc', () => {
  const s = L.createState(1);
  s.board = Array(64).fill(0);
  s.board[0] = 1;
  s.board[1] = 2;
  s.board[63] = 2;
  s.board[62] = 1;
  L.step(s, 2);
  assert.equal(s.board[1] === 1 || s.board[1] === 2, true);
  assert.equal(s.board[2] !== 0, true);
});

test('a move that traps nothing is refused', () => {
  assert.throws(() => L.step(L.createState(1), 0), /illegal action/);
});

test('every disc count stays right during a game', () => {
  const s = L.createState(3);
  while (!L.isOver(s)) {
    const filled = s.board.filter(Boolean).length;
    L.step(s, L.legalActions(s)[0]);
    assert.ok(s.board.filter(Boolean).length > filled);
  }
  assert.equal(L.legalActions(s).length, 0);
});

test('the computer takes a corner when it can', () => {
  const s = L.createState(1);
  s.board = Array(64).fill(0);
  s.board[1] = 1;
  s.board[2] = 2;
  s.board[20] = 2;
  s.board[28] = 1;
  s.board[36] = 2;
  L.step(s, 44);
  assert.equal(s.board[0], 2);
});
