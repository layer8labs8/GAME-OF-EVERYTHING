const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes car in lane 1 with 3 hull and 0 distance', () => {
  const s = L.createState(1);
  assert.equal(s.lane, 1);
  assert.equal(s.hull, 3);
  assert.equal(s.distance, 0);
  assert.equal(s.points, 0);
  assert.deepEqual(L.legalActions(s), L.ACTIONS);
});

test('left and right shift lanes and clamp at edges', () => {
  const s = L.createState(2);
  L.step(s, 'left');
  assert.equal(s.lane, 0);
  L.step(s, 'left');
  assert.equal(s.lane, 0); // clamped at 0

  L.step(s, 'right');
  assert.equal(s.lane, 1);
  L.step(s, 'right');
  assert.equal(s.lane, 2);
  L.step(s, 'right');
  assert.equal(s.lane, 2); // clamped at 2
});

test('nitro accelerates distance gain and doubles points', () => {
  const s = L.createState(3);
  const res = L.step(s, 'nitro');
  assert.equal(s.distance, 14);
  assert.equal(res.reward, 4);
});

test('crashing into rival car deducts hull and resets streak', () => {
  const s = L.createState(4);
  s.streak = 5;
  s.spawnCooldown = 20;
  s.traffic = [{ id: 99, lane: 1, y: L.PLAYER_Y, speed: 2, type: 0 }];

  const res = L.step(s, 'wait');
  assert.equal(s.hull, 2);
  assert.equal(s.streak, 0);
  assert.equal(s.traffic.length, 0);
  assert.ok(res.reward < 0);
});

test('collecting fuel canister restores hull up to 3', () => {
  const s = L.createState(5);
  s.hull = 2;
  s.items = [{ id: 88, lane: 1, y: L.PLAYER_Y, type: 'fuel' }];

  const res = L.step(s, 'wait');
  assert.equal(s.hull, 3);
  assert.equal(s.items.length, 0);
  assert.ok(res.reward >= 40);
});

test('losing all hull ends game', () => {
  const s = L.createState(6);
  s.hull = 1;
  s.traffic = [{ id: 99, lane: 1, y: L.PLAYER_Y, speed: 2, type: 0 }];

  const res = L.step(s, 'wait');
  assert.equal(s.hull, 0);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(7);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'brake'), /illegal/i);
  assert.throws(() => L.step(s, null), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield deterministic state', () => {
  const a = L.createState(42);
  const b = L.createState(42);
  const seq = ['wait', 'nitro', 'left', 'wait', 'right', 'nitro'];
  for (const act of seq) {
    if (L.isOver(a)) break;
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
