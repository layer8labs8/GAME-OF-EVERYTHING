const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');
const S = require('./solver.js');

test('every seeded shuffle is solvable (even inversion count) and not pre-solved', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = L.createState(seed);
    assert.equal(L.inversions(s.tiles) % 2, 0, `seed ${seed}`);
    assert.equal(s.solved, false);
    assert.deepEqual([...s.tiles].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  }
});

test('legalActions returns only orthogonal neighbours of the empty gap', () => {
  const s = L.createState(1);
  s.tiles = [1, 2, 3, 4, 0, 5, 6, 7, 8];
  assert.deepEqual(L.legalActions(s), [1, 3, 5, 7]);
  s.tiles = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(L.legalActions(s), [1, 3]);
});

test('sliding final tile into place solves the puzzle and gives win bonus', () => {
  const s = L.createState(1);
  s.tiles = [1, 2, 3, 4, 5, 6, 7, 0, 8];
  const res = L.step(s, 8);
  assert.equal(s.solved, true);
  assert.equal(res.done, true);
  assert.ok(res.reward >= 100);
  assert.equal(L.score(s), 198);
  assert.deepEqual(L.legalActions(s), []);
});

test('step limit ends unsolved game at MAX_STEPS', () => {
  const s = L.createState(1);
  s.stepCount = L.MAX_STEPS - 1;
  const act = L.legalActions(s)[0];
  const res = L.step(s, act);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('illegal non-adjacent tile throws without mutating state', () => {
  const s = L.createState(2);
  s.tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  s.solved = false;
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 0), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield identical state', () => {
  const a = L.createState(64);
  const b = L.createState(64);
  for (let i = 0; i < 12; i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});

test('solver validates level shape and detects odd inversions', () => {
  assert.deepEqual(S.validateLevel({ tiles: [1, 2, 0, 4, 5, 3, 7, 8, 6] }), []);
  assert.ok(S.validateLevel({ tiles: [1, 2, 3] }).length > 0);
  assert.ok(S.validateLevel({ tiles: [2, 1, 3, 4, 5, 6, 7, 8, 0] }).length > 0);
});

test('solver solves and replays shortest path for test board', () => {
  const data = { tiles: [1, 2, 0, 4, 5, 3, 7, 8, 6] };
  const res = S.solve(data);
  assert.equal(res.solvable, true);
  assert.equal(res.moves, 'DD');
  assert.equal(S.replay(data, res.moves), true);
  assert.equal(S.replay(data, 'DU'), false);
});
