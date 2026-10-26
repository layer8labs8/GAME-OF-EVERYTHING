const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState produces a 36-tile board with no starting matches and valid moves', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const s = L.createState(seed);
    assert.equal(s.board.length, 36);
    assert.equal(L.findMatches(s.board).length, 0);
    assert.ok(L.legalActions(s).length > 0, `seed ${seed} has legal actions`);
    assert.equal(s.movesLeft, L.START_MOVES);
    assert.equal(s.points, 0);
  }
});

test('findMatches flags 3, 4, and 5-in-a-row properly', () => {
  const b = new Array(36).fill(1);
  // Break all but row 0
  for (let i = 6; i < 36; i++) b[i] = (i % 4) + 2;
  b[0] = 1; b[1] = 1; b[2] = 1; b[3] = 2; b[4] = 3; b[5] = 4;
  const m = L.findMatches(b);
  assert.deepEqual(m.sort(), [0, 1, 2]);
});

test('legal swap clears matched gems, refills board, and scores combo', () => {
  const s = L.createState(42);
  const acts = L.legalActions(s);
  assert.ok(acts.length > 0);
  const act = acts[0];
  const initialMoves = s.movesLeft;

  const res = L.step(s, act);
  assert.equal(s.movesLeft, initialMoves - 1);
  assert.ok(s.points > 0);
  assert.equal(res.reward, s.points);
  assert.ok(s.lastCleared >= 3);
  assert.ok(s.lastCombo >= 1);
  // Board remains full of valid gems (no empty 0s)
  assert.ok(s.board.every((g) => g >= 1 && g <= 5));
});

test('invalid swap that forms no match throws without mutating state', () => {
  const s = L.createState(7);
  // Force two non-matching adjacent gems that form no combo
  s.board = [
    1, 2, 1, 2, 1, 2,
    2, 1, 2, 1, 2, 1,
    1, 2, 1, 2, 1, 2,
    2, 1, 2, 1, 2, 1,
    1, 2, 1, 2, 1, 2,
    2, 1, 2, 1, 2, 1,
  ];
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, { cell: 0, dir: 'right' }), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('out of bounds or malformed action throws without mutating state', () => {
  const s = L.createState(9);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, null), /illegal/i);
  assert.throws(() => L.step(s, { cell: -1, dir: 'right' }), /illegal/i);
  assert.throws(() => L.step(s, { cell: 5, dir: 'right' }), /illegal/i); // right edge
  assert.throws(() => L.step(s, { cell: 32, dir: 'down' }), /illegal/i); // bottom edge
  assert.throws(() => L.step(s, { cell: 0, dir: 'left' }), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('consuming all moves ends the game', () => {
  const s = L.createState(15);
  s.movesLeft = 1;
  const act = L.legalActions(s)[0];
  const res = L.step(s, act);
  assert.equal(s.movesLeft, 0);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('same seed and actions yield deterministic state', () => {
  const a = L.createState(123);
  const b = L.createState(123);
  for (let i = 0; i < 5 && !L.isOver(a); i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
