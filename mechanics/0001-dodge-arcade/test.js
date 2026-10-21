const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('./www/logic.js');

test('player stays inside the screen on both sides', () => {
  const s = G.createState(1);
  for (let i = 0; i < 10; i++) G.step(s, 0.1, -1000);
  assert.equal(s.player.x, s.player.r);
  for (let i = 0; i < 20; i++) G.step(s, 0.1, 5000);
  assert.equal(s.player.x, s.w - s.player.r);
});

test('player moves toward target at limited speed', () => {
  const s = G.createState(1);
  const x0 = s.player.x;
  G.step(s, 0.1, x0 + 1000);
  assert.ok(Math.abs(s.player.x - (x0 + 42)) < 1e-9);
});

test('a rock spawns after the spawn timer runs out and falls', () => {
  const s = G.createState(1);
  G.step(s, 0.7, s.player.x);
  assert.equal(s.rocks.length, 1);
  const y0 = s.rocks[0].y;
  G.step(s, 0.1, s.player.x);
  assert.ok(s.rocks[0].y > y0);
});

test('touching a rock ends the game and freezes the state', () => {
  const s = G.createState(1);
  s.rocks.push({ x: s.player.x, y: s.player.y, r: 10, vy: 0 });
  G.step(s, 0.016, s.player.x);
  assert.equal(s.over, true);
  const t = s.time;
  G.step(s, 1, s.player.x);
  assert.equal(s.time, t);
});

test('score grows with survival time', () => {
  const s = G.createState(1);
  for (let i = 0; i < 4; i++) G.step(s, 0.25, s.player.x);
  assert.equal(s.score, 10);
});

test('rocks below the screen are removed', () => {
  const s = G.createState(1);
  s.rocks.push({ x: 10, y: s.h + 100, r: 5, vy: 0 });
  G.step(s, 0.016, s.player.x);
  assert.ok(s.rocks.every((k) => k.y < s.h + 50));
});

test('difficulty rises with time', () => {
  assert.ok(G.spawnInterval(60) < G.spawnInterval(0));
  assert.ok(G.fallSpeed(30) > G.fallSpeed(0));
  assert.ok(G.fallSpeed(10000) <= 420);
});

test('same seed gives the same game', () => {
  const a = G.createState(7);
  const b = G.createState(7);
  for (let i = 0; i < 600; i++) {
    G.step(a, 1 / 60, 100);
    G.step(b, 1 / 60, 100);
  }
  assert.equal(a.score, b.score);
  assert.deepEqual(a.rocks, b.rocks);
});
