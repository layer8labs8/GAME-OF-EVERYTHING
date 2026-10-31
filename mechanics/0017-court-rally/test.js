const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initialises court, paddles and moving ball', () => {
  const s = L.createState(10);
  assert.equal(s.playerX, 150);
  assert.equal(s.aiX, 150);
  assert.equal(s.playerScore, 0);
  assert.equal(s.aiScore, 0);
  assert.ok(s.ball.vy > 0);
});

test('player paddle stays clamped inside side walls', () => {
  const s = L.createState(1);
  for (let i = 0; i < 40; i++) L.step(s, 'L');
  assert.equal(s.playerX, s.paddleW / 2);
  for (let i = 0; i < 60; i++) L.step(s, 'R');
  assert.equal(s.playerX, L.W - s.paddleW / 2);
});

test('ball bounces off left and right walls', () => {
  const s = L.createState(1);
  s.ball = { x: 4, y: 200, vx: -5, vy: 2, r: 6 };
  L.step(s, 'S');
  assert.ok(s.ball.vx > 0);
  s.ball = { x: 296, y: 200, vx: 5, vy: 2, r: 6 };
  L.step(s, 'S');
  assert.ok(s.ball.vx < 0);
});

test('player paddle return reverses ball upward and increments rallies', () => {
  const s = L.createState(1);
  s.playerX = 150;
  s.ball = { x: 162, y: L.PLAYER_Y - 10, vx: 1, vy: 6, r: 6 };
  const res = L.step(s, 'S');
  assert.equal(res.reward, 1);
  assert.equal(s.rallies, 1);
  assert.ok(s.ball.vy < 0);
});

test('passing top baseline awards player point and winning 5th point ends match', () => {
  const s = L.createState(1);
  s.playerScore = 4;
  s.ball = { x: 20, y: 2, vx: 0, vy: -6, r: 6 };
  s.aiX = 250;
  const res = L.step(s, 'S');
  assert.equal(s.playerScore, 5);
  assert.equal(res.reward, 45);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('passing bottom baseline awards opponent point', () => {
  const s = L.createState(1);
  s.playerX = 40;
  s.ball = { x: 260, y: L.H - 2, vx: 0, vy: 6, r: 6 };
  const res = L.step(s, 'S');
  assert.equal(s.aiScore, 1);
  assert.equal(res.reward, -10);
  assert.equal(res.done, false);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(4);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'JUMP'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield deterministic match', () => {
  const a = L.createState(21);
  const b = L.createState(21);
  for (let i = 0; i < 50; i++) {
    const act = ['L', 'S', 'R'][i % 3];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
