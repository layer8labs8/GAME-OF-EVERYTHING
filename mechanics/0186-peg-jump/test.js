const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

const count = (s, v) => s.board.filter((x) => x === v).length;

test('the board is a cross with 32 pegs and one hole', () => {
  const s = L.createState(1);
  assert.equal(count(s, 1), 32);
  assert.equal(count(s, 0), 1);
  assert.equal(count(s, -1), 16);
});

test('a jump removes the jumped peg', () => {
  const s = L.createState(1);
  const pegs = count(s, 1);
  const res = L.step(s, L.legalActions(s)[0]);
  assert.equal(count(s, 1), pegs - 1);
  assert.equal(res.reward, 10);
});

test('a jump into a filled hole is refused', () => {
  const s = L.createState(1);
  assert.throws(() => L.step(s, '2:4'), /illegal action/);
});

test('jumping over an empty hole is not possible', () => {
  const s = L.createState(1);
  s.board = s.board.map((v) => (v === -1 ? -1 : 0));
  s.board[24] = 1;
  s.board[26] = 0;
  assert.deepEqual(L.legalActions(s), []);
  assert.equal(L.isOver(s), true);
});

test('one peg left earns the bonus', () => {
  const s = L.createState(1);
  s.pegs = 1;
  assert.equal(L.score(s), 510);
});

test('every game ends', () => {
  const s = L.createState(2);
  while (!L.isOver(s)) L.step(s, L.legalActions(s)[0]);
  assert.ok(s.pegs >= 1);
});
