const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('every seeded puzzle has 9 empty cells and a unique solution', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = L.createState(seed);
    assert.equal(s.board.filter((v) => v === 0).length, 9, `seed ${seed}`);
    assert.equal(L.countSolutions(s.board.slice(), 2), 1, `unique seed ${seed}`);
  }
});

test('placing correct digits solves puzzle and awards completion bonus', () => {
  const s = L.createState(3);
  let lastRes = null;
  for (let i = 0; i < 16; i++) {
    if (s.board[i] === 0) {
      lastRes = L.step(s, { cell: i, digit: s.solution[i] });
    }
  }
  assert.equal(s.solved, true);
  assert.equal(lastRes.done, true);
  assert.equal(lastRes.reward, 95);
  assert.equal(L.score(s), 9 * 15 + 80);
  assert.deepEqual(L.legalActions(s), []);
});

test('three wrong placements end the game with mistakes = 3', () => {
  const s = L.createState(4);
  const empty = s.board.indexOf(0);
  const wrong = (s.solution[empty] % 4) + 1;
  assert.equal(L.step(s, { cell: empty, digit: wrong }).done, false);
  assert.equal(L.step(s, { cell: empty, digit: wrong }).done, false);
  const fin = L.step(s, { cell: empty, digit: wrong });
  assert.equal(s.mistakes, 3);
  assert.equal(fin.done, true);
  assert.equal(L.isOver(s), true);
});

test('placing on a pre-filled clue throws without mutating state', () => {
  const s = L.createState(2);
  const clue = s.given.indexOf(true);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, { cell: clue, digit: 1 }), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('canUse rejects duplicate digit in row, column or 2x2 box', () => {
  const b = [
    1, 0, 0, 0,
    0, 0, 2, 0,
    0, 3, 0, 0,
    0, 0, 0, 0,
  ];
  assert.equal(L.canUse(b, 1, 1), false);
  assert.equal(L.canUse(b, 5, 1), false);
  assert.equal(L.canUse(b, 9, 3), false);
  assert.equal(L.canUse(b, 1, 3), false);
  assert.equal(L.canUse(b, 1, 4), true);
});

test('same seed and actions produce identical state', () => {
  const a = L.createState(51);
  const b = L.createState(51);
  for (let i = 0; i < 6 && !L.isOver(a); i++) {
    const acts = L.legalActions(a);
    const act = acts[i % acts.length];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
