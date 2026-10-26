const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes runner in lane 1 with 3 shields and 0 distance', () => {
  const s = L.createState(1);
  assert.equal(s.lane, 1);
  assert.equal(s.shields, 3);
  assert.equal(s.distance, 0);
  assert.equal(s.jumping, 0);
  assert.equal(s.sliding, 0);
  assert.deepEqual(L.legalActions(s), L.ACTIONS);
});

test('left and right shift lanes and clamp at edges', () => {
  const s = L.createState(2);
  L.step(s, 'left');
  assert.equal(s.lane, 0);
  L.step(s, 'left');
  assert.equal(s.lane, 0);

  L.step(s, 'right');
  assert.equal(s.lane, 1);
  L.step(s, 'right');
  assert.equal(s.lane, 2);
  L.step(s, 'right');
  assert.equal(s.lane, 2);
});

test('jumping clears hurdle safely without shield loss', () => {
  const s = L.createState(3);
  s.spawnTimer = 20;
  s.obstacles = [{ id: 1, lane: 1, y: L.PLAYER_Y, type: 'hurdle' }];

  const res = L.step(s, 'jump');
  assert.equal(s.shields, 3);
  assert.equal(s.obstacles.length, 0);
  assert.ok(res.reward > 0);
});

test('sliding slips under laser safely without shield loss', () => {
  const s = L.createState(4);
  s.spawnTimer = 20;
  s.obstacles = [{ id: 2, lane: 1, y: L.PLAYER_Y, type: 'laser' }];

  const res = L.step(s, 'slide');
  assert.equal(s.shields, 3);
  assert.equal(s.obstacles.length, 0);
  assert.ok(res.reward > 0);
});

test('hitting hurdle while running costs a shield and resets streak', () => {
  const s = L.createState(5);
  s.streak = 5;
  s.spawnTimer = 20;
  s.obstacles = [{ id: 3, lane: 1, y: L.PLAYER_Y, type: 'hurdle' }];

  const res = L.step(s, 'wait');
  assert.equal(s.shields, 2);
  assert.equal(s.streak, 0);
  assert.ok(res.reward < 0);
});

test('collecting power orb awards 30 bonus points', () => {
  const s = L.createState(6);
  s.spawnTimer = 20;
  s.obstacles = [{ id: 4, lane: 1, y: L.PLAYER_Y, type: 'orb' }];

  const res = L.step(s, 'wait');
  assert.equal(s.points, 32); // 30 orb + 2 tick
  assert.equal(res.reward, 32);
});

test('losing all shields ends game', () => {
  const s = L.createState(7);
  s.shields = 1;
  s.spawnTimer = 20;
  s.obstacles = [{ id: 5, lane: 1, y: L.PLAYER_Y, type: 'barrier' }];

  const res = L.step(s, 'wait');
  assert.equal(s.shields, 0);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(8);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'fly'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield deterministic state', () => {
  const a = L.createState(99);
  const b = L.createState(99);
  const seq = ['wait', 'jump', 'left', 'slide', 'right', 'wait'];
  for (const act of seq) {
    if (L.isOver(a)) break;
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
