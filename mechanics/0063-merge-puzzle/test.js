const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState spawns exactly two initial tiles of value 2 or 4', () => {
  const s = L.createState(11);
  const nonZero = s.grid.flat().filter((v) => v !== 0);
  assert.equal(nonZero.length, 2);
  assert.ok(nonZero.every((v) => v === 2 || v === 4));
});

test('sliding merges equal pairs once per move and adds merged score', () => {
  const res = L.simulateSlide(
    [
      [2, 2, 2, 2],
      [4, 0, 4, 0],
      [2, 2, 4, 0],
      [0, 0, 0, 0],
    ],
    'L'
  );
  assert.deepEqual(res.grid[0], [4, 4, 0, 0]);
  assert.deepEqual(res.grid[1], [8, 0, 0, 0]);
  assert.deepEqual(res.grid[2], [4, 4, 0, 0]);
  assert.equal(res.gain, 20);
});

test('legalActions excludes directions that do not move or merge any tile', () => {
  const s = L.createState(1);
  s.grid = [
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const acts = L.legalActions(s);
  assert.deepEqual(acts, ['D', 'R']);
});

test('step slides, scores merges and spawns exactly one new tile', () => {
  const s = L.createState(5);
  s.grid = [
    [4, 4, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const res = L.step(s, 'L');
  assert.equal(res.reward, 8);
  assert.equal(s.points, 8);
  assert.equal(s.grid[0][0], 8);
  assert.equal(s.grid.flat().filter((v) => v !== 0).length, 2);
});

test('locked full board with no equal neighbours is game over', () => {
  const s = L.createState(1);
  s.grid = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ];
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(1);
  s.grid = [
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'L'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions give identical state', () => {
  const a = L.createState(42);
  const b = L.createState(42);
  for (let i = 0; i < 15; i++) {
    const acts = L.legalActions(a);
    if (!acts.length) break;
    L.step(a, acts[0]);
    L.step(b, acts[0]);
  }
  assert.deepEqual(a, b);
});
