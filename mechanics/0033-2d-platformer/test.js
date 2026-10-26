const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes hero on platform with 3 lives and 7 coins', () => {
  const s = L.createState(1);
  assert.equal(s.lives, 3);
  assert.equal(s.coins.length, 7);
  assert.equal(s.coinsCollected, 0);
  assert.equal(s.won, false);
  assert.equal(s.player.grounded, true);
  assert.deepEqual(L.legalActions(s), ['left', 'right', 'jump', 'wait']);
});

test('left and right movements change player x position', () => {
  const s = L.createState(2);
  const startX = s.player.x;
  L.step(s, 'right');
  assert.ok(s.player.x > startX);
  L.step(s, 'left');
  L.step(s, 'left');
  assert.ok(s.player.x < startX);
});

test('jumping launches player up and gravity pulls back down to platform', () => {
  const s = L.createState(3);
  const groundY = s.player.y;
  L.step(s, 'jump');
  assert.ok(s.player.y < groundY);
  assert.equal(s.player.grounded, false);

  // Fall back down
  for (let i = 0; i < 25; i++) {
    L.step(s, 'wait');
  }
  assert.equal(s.player.grounded, true);
  assert.equal(s.player.y, groundY);
});

test('touching coin collects it and increments points', () => {
  const s = L.createState(4);
  s.player.x = L.COIN_SPOTS[0].x - 5;
  s.player.y = L.COIN_SPOTS[0].y;
  const res = L.step(s, 'right');
  assert.equal(s.coinsCollected, 1);
  assert.equal(s.points, 50);
  assert.equal(res.reward, 50);
  assert.equal(s.coins[0].collected, true);
});

test('falling off screen costs a life and respawns at base', () => {
  const s = L.createState(5);
  // Walk off the right edge of base platform (x > 150)
  for (let i = 0; i < 30; i++) {
    L.step(s, 'right');
  }
  // Let player fall
  for (let i = 0; i < 30; i++) {
    L.step(s, 'wait');
  }
  assert.ok(s.lives < 3);
});

test('losing all lives ends game', () => {
  const s = L.createState(6);
  s.lives = 1;
  s.player.y = L.ARENA_H + 25;
  const res = L.step(s, 'wait');
  assert.equal(s.lives, 0);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(7);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'fly'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield deterministic state', () => {
  const a = L.createState(88);
  const b = L.createState(88);
  const seq = ['right', 'jump', 'right', 'wait', 'left', 'jump', 'wait'];
  for (const act of seq) {
    if (L.isOver(a)) break;
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
