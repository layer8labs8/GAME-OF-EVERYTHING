const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes player, spawn, crystals and 3 lives', () => {
  const s = L.createState(1);
  assert.equal(s.player.grounded, true);
  assert.equal(s.player.lives, 3);
  assert.equal(s.player.dashes, 1);
  assert.equal(s.crystals.length, 2);
  assert.equal(s.won, false);
  assert.equal(s.lost, false);
});

test('moving right shifts player position and respects border bounds', () => {
  const s = L.createState(1);
  const startX = s.player.x;
  L.step(s, 'right');
  assert.ok(s.player.x > startX);
});

test('jumping imparts upward velocity and unsets grounded', () => {
  const s = L.createState(1);
  assert.ok(L.legalActions(s).includes('jump'));
  L.step(s, 'jump');
  assert.equal(s.player.grounded, false);
  assert.ok(s.player.vy < 0);
});

test('air dash consumes dash charge and imparts high velocity burst', () => {
  const s = L.createState(1);
  L.step(s, 'jump');
  assert.ok(L.legalActions(s).includes('dash_right'));
  L.step(s, 'dash_right');
  assert.equal(s.player.dashes, 0);
  assert.ok(!L.legalActions(s).includes('dash_right'));
});

test('collecting crystal awards points and marks crystal collected', () => {
  const s = L.createState(1);
  s.player.x = s.crystals[0].x;
  s.player.y = s.crystals[0].y + 0.4;
  const res = L.step(s, 'wait');
  assert.equal(s.crystals[0].collected, true);
  assert.ok(res.reward >= 30);
  assert.ok(s.score >= 30);
});

test('entering portal with all crystals gathered wins the game', () => {
  const s = L.createState(1);
  s.crystals.forEach((c) => (c.collected = true));
  s.player.x = s.portal.x;
  s.player.y = s.portal.y + 0.4;
  const res = L.step(s, 'wait');
  assert.equal(s.won, true);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('falling into spikes deducts life and respawns at spawn anchor', () => {
  const s = L.createState(1);
  // (4, 9) has spike '^'
  s.player.x = 4.5;
  s.player.y = 9.2;
  const res = L.step(s, 'wait');
  assert.equal(s.player.lives, 2);
  assert.equal(s.player.x, s.spawn.x);
  assert.equal(s.player.y, s.spawn.y);
  assert.ok(res.reward < 0);
});

test('losing all lives triggers defeat', () => {
  const s = L.createState(1);
  s.player.lives = 1;
  s.player.x = 4.5;
  s.player.y = 9.2;
  const res = L.step(s, 'wait');
  assert.equal(s.player.lives, 0);
  assert.equal(s.lost, true);
  assert.equal(res.done, true);
});

test('exceeding MAX_STEPS terminates game cleanly', () => {
  const s = L.createState(1);
  s.stepCount = L.MAX_STEPS - 1;
  const res = L.step(s, 'wait');
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(1);
  s.player.dashes = 0;
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'dash_right'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const a = L.createState(101);
  const b = L.createState(101);
  for (let i = 0; i < 12; i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
