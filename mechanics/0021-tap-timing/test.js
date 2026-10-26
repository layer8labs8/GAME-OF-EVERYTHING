const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState prepares valid target zone and 3 lives', () => {
  const s = L.createState(8);
  assert.equal(s.lives, 3);
  assert.ok(s.target >= 20 && s.target <= 80);
  assert.ok(s.perfectRadius < s.goodRadius);
});

test('wait sweeps needle and bounces cleanly off 0 and 100', () => {
  const s = L.createState(1);
  s.pos = 99;
  s.dir = 1;
  s.speed = 3;
  L.step(s, 'wait');
  assert.equal(s.dir, -1);
  assert.ok(s.pos <= 100 && s.pos >= 0);

  s.pos = 1;
  s.dir = -1;
  L.step(s, 'wait');
  assert.equal(s.dir, 1);
  assert.ok(s.pos >= 0);
});

test('tapping inside perfect zone awards perfect points and increments streak', () => {
  const s = L.createState(1);
  s.pos = s.target;
  const r1 = L.step(s, 'tap');
  assert.equal(r1.reward, 25);
  assert.equal(s.streak, 1);
  assert.equal(s.locks, 1);
  assert.equal(s.lastGrade, 'perfect');

  s.pos = s.target;
  const r2 = L.step(s, 'tap');
  assert.equal(r2.reward, 30);
  assert.equal(s.streak, 2);
});

test('tapping inside good zone but outside perfect zone awards good points', () => {
  const s = L.createState(1);
  s.pos = s.target + s.perfectRadius + 1;
  const res = L.step(s, 'tap');
  assert.equal(res.reward, 10);
  assert.equal(s.lastGrade, 'good');
  assert.equal(s.locks, 1);
});

test('tapping outside good zone costs a life and resets streak', () => {
  const s = L.createState(1);
  s.streak = 4;
  s.pos = s.target > 50 ? 2 : 98;
  const res = L.step(s, 'tap');
  assert.equal(res.reward, -10);
  assert.equal(s.lives, 2);
  assert.equal(s.streak, 0);
  assert.equal(s.lastGrade, 'miss');
});

test('unlocking the 25th lock wins with +100 vault bonus', () => {
  const s = L.createState(1);
  s.locks = L.MAX_LOCKS - 1;
  s.pos = s.target;
  const res = L.step(s, 'tap');
  assert.equal(res.reward, 125);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(3);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'hold'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions produce identical state', () => {
  const a = L.createState(55);
  const b = L.createState(55);
  for (const act of ['wait', 'wait', 'tap', 'wait', 'tap']) {
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
