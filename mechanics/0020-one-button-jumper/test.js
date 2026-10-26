const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState starts grounded with initial obstacle ahead', () => {
  const s = L.createState(3);
  assert.equal(s.y, 0);
  assert.equal(s.alive, true);
  assert.equal(s.obstacles.length, 1);
  assert.ok(s.obstacles[0].x > L.PLAYER_X);
});

test('jump launches player upward and gravity returns player to ground', () => {
  const s = L.createState(1);
  s.obstacles = [];
  s.spawnGap = 9999;
  L.step(s, 'jump');
  assert.ok(s.y > 0);
  for (let i = 0; i < 30; i++) L.step(s, 'run');
  assert.equal(s.y, 0);
});

test('holding jump reaches higher peak than tapping jump once', () => {
  const tap = L.createState(1);
  const hold = L.createState(1);
  tap.obstacles = [];
  hold.obstacles = [];
  tap.spawnGap = 9999;
  hold.spawnGap = 9999;
  L.step(tap, 'jump');
  L.step(hold, 'jump');
  let maxTap = tap.y;
  let maxHold = hold.y;
  for (let i = 0; i < 15; i++) {
    L.step(tap, 'run');
    L.step(hold, 'jump');
    maxTap = Math.max(maxTap, tap.y);
    maxHold = Math.max(maxHold, hold.y);
  }
  assert.ok(maxHold > maxTap);
});

test('hitting an obstacle while low ends the game', () => {
  const s = L.createState(1);
  s.obstacles = [{ x: L.PLAYER_X, w: 20, h: 30, passed: false }];
  const res = L.step(s, 'run');
  assert.deepEqual(res, { reward: -20, done: true });
  assert.equal(s.alive, false);
  assert.deepEqual(L.legalActions(s), []);
});

test('vaulting above an obstacle clears it and awards +10 bonus', () => {
  const s = L.createState(1);
  s.y = 50;
  s.vy = 0;
  s.obstacles = [{ x: L.PLAYER_X - 14, w: 8, h: 24, passed: false }];
  const res = L.step(s, 'run');
  assert.equal(s.alive, true);
  assert.equal(s.cleared, 1);
  assert.equal(res.reward, 11);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(2);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'slide'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions give identical state', () => {
  const a = L.createState(44);
  const b = L.createState(44);
  for (let i = 0; i < 30; i++) {
    const act = i % 9 === 0 ? 'jump' : 'run';
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
