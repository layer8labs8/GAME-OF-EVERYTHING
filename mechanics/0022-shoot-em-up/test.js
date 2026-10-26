const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes player centered with 3 shields and wave 1', () => {
  const s = L.createState(1);
  assert.equal(s.player.x, L.ARENA_W / 2);
  assert.equal(s.shields, 3);
  assert.equal(s.wave, 1);
  assert.equal(s.bullets.length, 0);
  assert.deepEqual(L.legalActions(s), ['left', 'right', 'stay', 'fire']);
});

test('left and right movements are clamped inside arena walls', () => {
  const s = L.createState(2);
  s.player.x = 20;
  L.step(s, 'left');
  assert.equal(s.player.x, 16);
  L.step(s, 'left');
  assert.equal(s.player.x, 16);

  s.player.x = L.ARENA_W - 20;
  L.step(s, 'right');
  assert.equal(s.player.x, L.ARENA_W - 16);
  L.step(s, 'right');
  assert.equal(s.player.x, L.ARENA_W - 16);
});

test('firing spawns upward bullet that advances each step', () => {
  const s = L.createState(3);
  L.step(s, 'fire');
  assert.equal(s.bullets.length, 1);
  const initialY = s.bullets[0].y;
  assert.equal(s.bullets[0].x, s.player.x);

  L.step(s, 'stay');
  assert.ok(s.bullets[0].y < initialY);
});

test('bullet destroys enemy and awards points with streak multiplier', () => {
  const s = L.createState(4);
  s.player.x = 100;
  s.bullets = [{ x: 100, y: 150, vy: -14 }];
  s.enemies = [{ x: 100, y: 140, vx: 0, vy: 2, hp: 1, type: 1 }];

  const res = L.step(s, 'stay');
  assert.equal(s.enemies.length, 0);
  assert.equal(s.bullets.length, 0);
  assert.equal(s.points, 100);
  assert.equal(res.reward, 100);
  assert.equal(s.multiplier, 2);
});

test('enemy collision costs a shield and resets multiplier', () => {
  const s = L.createState(5);
  s.multiplier = 3;
  s.enemies = [{ x: s.player.x, y: L.PLAYER_Y, vx: 0, vy: 1, hp: 1, type: 1 }];

  L.step(s, 'stay');
  assert.equal(s.shields, 2);
  assert.equal(s.multiplier, 1);
});

test('losing all shields ends game', () => {
  const s = L.createState(6);
  s.shields = 1;
  s.enemies = [{ x: s.player.x, y: L.PLAYER_Y, vx: 0, vy: 1, hp: 1, type: 1 }];

  const res = L.step(s, 'stay');
  assert.equal(s.shields, 0);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(7);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'jump'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield deterministic state', () => {
  const a = L.createState(99);
  const b = L.createState(99);
  const seq = ['stay', 'fire', 'left', 'fire', 'right', 'right', 'stay', 'fire'];
  for (const act of seq) {
    if (L.isOver(a)) break;
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
