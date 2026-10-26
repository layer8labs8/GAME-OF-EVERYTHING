const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');
const S = require('./solver.js');

test('rotCW rotates pipe bitmasks 90 degrees clockwise and 4 turns restore mask', () => {
  assert.equal(L.rotCW(1), 2); // N -> E
  assert.equal(L.rotCW(2), 4); // E -> S
  assert.equal(L.rotCW(4), 8); // S -> W
  assert.equal(L.rotCW(8), 1); // W -> N
  assert.equal(L.rotCW(L.rotCW(L.rotCW(L.rotCW(7)))), 7);
});

test('createState generates scrambled network with wet source and dry drain', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const s = L.createState(seed);
    assert.equal(s.pipes.length, 25);
    assert.equal(s.wet[0], true);
    assert.equal(s.connected, false);
    assert.ok(L.legalActions(s).length > 0);
  }
});

test('rotating final elbow to bridge source to drain wins the game', () => {
  const s = L.createState(1);
  s.pipes = Array(25).fill(0);
  s.pipes[0] = 4; // S
  s.pipes[5] = 5; // N|S
  s.pipes[10] = 5;
  s.pipes[15] = 5;
  s.pipes[20] = 9; // N|W (rotCW(9) = 3 N|E)
  s.pipes[21] = 10; // E|W
  s.pipes[22] = 10;
  s.pipes[23] = 10;
  s.pipes[24] = 8; // W
  s.wet = L.computeWet(s.pipes);
  s.connected = false;
  const res = L.step(s, 20);
  assert.equal(s.pipes[20], 3);
  assert.equal(s.connected, true);
  assert.equal(res.done, true);
  assert.ok(res.reward >= 100);
  assert.deepEqual(L.legalActions(s), []);
});

test('running out of rotations ends game', () => {
  const s = L.createState(2);
  s.movesLeft = 1;
  const act = L.legalActions(s)[0];
  const res = L.step(s, act);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('rotating empty or cross pipe throws without mutating state', () => {
  const s = L.createState(1);
  s.pipes[12] = 0;
  s.pipes[13] = 15;
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 12), /illegal/i);
  assert.throws(() => L.step(s, 13), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield identical state', () => {
  const a = L.createState(77);
  const b = L.createState(77);
  for (let i = 0; i < 8; i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});

test('solver validates pipe level shape and endpoints', () => {
  assert.deepEqual(S.validateLevel({ pipes: [2,0,0,0,0,5,0,0,0,0,5,0,0,0,0,5,0,0,0,0,3,10,10,10,8] }), []);
  assert.ok(S.validateLevel({ pipes: [1, 2, 3] }).length > 0);
  assert.ok(S.validateLevel({ pipes: Array(25).fill(0) }).length > 0);
});

test('solver solves and replays single rotation puzzle', () => {
  const data = { pipes: [2,0,0,0,0,5,0,0,0,0,5,0,0,0,0,5,0,0,0,0,3,10,10,10,8] };
  const res = S.solve(data);
  assert.equal(res.solvable, true);
  assert.equal(res.moves, 'a');
  assert.equal(S.replay(data, res.moves), true);
  assert.equal(S.replay(data, 'b'), false);
});
