const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState prepares 9 burrows, 3 lives and at least one initial spawn', () => {
  const s = L.createState(12);
  assert.equal(s.holes.length, 9);
  assert.equal(s.lives, 3);
  assert.ok(s.holes.some((h) => h.kind !== 'empty'));
});

test('bonking a mole scores points, builds combo and clears burrow', () => {
  const s = L.createState(1);
  s.holes = Array.from({ length: 9 }, () => ({ kind: 'empty', ttl: 0 }));
  s.holes[4] = { kind: 'mole', ttl: 3 };
  const r1 = L.step(s, 4);
  assert.equal(r1.reward, 10);
  assert.equal(s.combo, 1);
  s.holes[2] = { kind: 'gold', ttl: 3 };
  const r2 = L.step(s, 2);
  assert.equal(r2.reward, 27);
  assert.equal(s.combo, 2);
});

test('bonking a bomb costs a life, resets combo and clamps points at zero', () => {
  const s = L.createState(1);
  s.points = 10;
  s.combo = 3;
  s.holes[0] = { kind: 'bomb', ttl: 3 };
  const res = L.step(s, 0);
  assert.equal(res.reward, -15);
  assert.equal(s.points, 0);
  assert.equal(s.lives, 2);
  assert.equal(s.combo, 0);
});

test('bonking an empty hole resets combo with -2 penalty', () => {
  const s = L.createState(1);
  s.holes = Array.from({ length: 9 }, () => ({ kind: 'empty', ttl: 0 }));
  s.combo = 4;
  const res = L.step(s, 7);
  assert.equal(res.reward, -2);
  assert.equal(s.combo, 0);
});

test('critter timer expiry clears burrow and resets combo on escaped mole', () => {
  const s = L.createState(1);
  s.holes = Array.from({ length: 9 }, () => ({ kind: 'empty', ttl: 0 }));
  s.holes[1] = { kind: 'mole', ttl: 1 };
  s.combo = 2;
  L.step(s, 'wait');
  assert.equal(s.combo, 0);
});

test('game ends at MAX_STEPS or when lives reach zero', () => {
  const s = L.createState(1);
  s.stepCount = L.MAX_STEPS - 1;
  const res = L.step(s, 'wait');
  assert.equal(res.done, true);
  assert.deepEqual(L.legalActions(s), []);

  const s2 = L.createState(1);
  s2.lives = 1;
  s2.holes[3] = { kind: 'bomb', ttl: 2 };
  assert.equal(L.step(s2, 3).done, true);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(5);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 9), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions produce identical state', () => {
  const a = L.createState(88);
  const b = L.createState(88);
  for (const act of ['wait', 0, 4, 'wait', 8, 2]) {
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
