const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState builds 40 bricks, 3 lives and upward ball', () => {
  const s = L.createState(5);
  assert.equal(s.bricks.length, 40);
  assert.equal(s.lives, 3);
  assert.equal(s.wave, 1);
  assert.ok(s.ball.vy < 0);
});

test('paddle movement clamps to arena bounds', () => {
  const s = L.createState(1);
  for (let i = 0; i < 30; i++) L.step(s, 'L');
  assert.equal(s.paddleX, L.PADDLE_W / 2);
  for (let i = 0; i < 60; i++) L.step(s, 'R');
  assert.equal(s.paddleX, L.W - L.PADDLE_W / 2);
});

test('striking a brick removes it, scores points and bounces ball', () => {
  const s = L.createState(1);
  const target = s.bricks[32]; // bottom row, 10 points
  s.ball = { x: target.x + target.w / 2, y: target.y + target.h + 4, vx: 0, vy: -5, r: 6 };
  const res = L.step(s, 'S');
  assert.equal(s.bricks.length, 39);
  assert.equal(s.points, target.points);
  assert.equal(res.reward, target.points);
  assert.ok(s.ball.vy > 0);
});

test('clearing the final brick advances wave and awards +100 bonus', () => {
  const s = L.createState(1);
  const only = s.bricks[0];
  s.bricks = [only];
  s.ball = { x: only.x + only.w / 2, y: only.y + only.h + 4, vx: 0, vy: -5, r: 6 };
  const res = L.step(s, 'S');
  assert.equal(s.wave, 2);
  assert.equal(s.bricks.length, 40);
  assert.equal(res.reward, only.points + 100);
});

test('missing ball costs a life and losing last life ends game', () => {
  const s = L.createState(1);
  s.lives = 1;
  s.ball = { x: 20, y: L.H + 3, vx: 0, vy: 5, r: 6 };
  const res = L.step(s, 'S');
  assert.equal(s.lives, 0);
  assert.equal(res.reward, -15);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('paddle bounce turns falling ball upward', () => {
  const s = L.createState(1);
  s.paddleX = 156;
  s.ball = { x: 166, y: L.PADDLE_Y - 10, vx: 1, vy: 5, r: 6 };
  L.step(s, 'S');
  assert.ok(s.ball.vy < 0);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(2);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'FIRE'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions give identical state', () => {
  const a = L.createState(33);
  const b = L.createState(33);
  for (let i = 0; i < 40; i++) {
    const act = ['L', 'R', 'S'][i % 3];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
