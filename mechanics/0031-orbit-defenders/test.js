const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes cannon at x=180 with 3 lives and 20 invaders', () => {
  const s = createState(404);
  assert.equal(s.player.x, 180);
  assert.equal(s.player.lives, 3);
  assert.equal(s.invaders.length, 20);
  assert.equal(s.bunkers.length, 3);
  assert.equal(isOver(s), false);
});

test('left and right shift cannon clamped to arena borders', () => {
  const s = createState(404);
  step(s, 'left');
  assert.equal(s.player.x, 172);

  step(s, 'right');
  assert.equal(s.player.x, 180);

  s.player.x = 24;
  step(s, 'left');
  assert.equal(s.player.x, 22); // clamped
});

test('firing discharges upward bullet and disallows duplicate fire', () => {
  const s = createState(404);
  const res = step(s, 'fire');
  assert.equal(res.reward, 1);
  assert.ok(s.player.bullet !== null);
  assert.equal(legalActions(s).includes('fire'), false);

  assert.throws(() => {
    step(s, 'fire');
  });
});

test('player bullet strikes invader, kills it and awards points', () => {
  const s = createState(404);
  const inv = s.invaders[15]; // an octopus
  s.player.bullet = { x: inv.x, y: inv.y + 8 };

  const prevScore = score(s);
  const res = step(s, 'wait');
  assert.ok(res.reward >= 10);
  assert.equal(inv.alive, false);
  assert.equal(s.player.bullet, null);
  assert.ok(score(s) > prevScore);
});

test('destroying mystery UFO awards 100 points', () => {
  const s = createState(404);
  s.ufo = { x: 100, y: 44, vx: 3, points: 100 };
  s.player.bullet = { x: 100, y: 50 };

  const prevScore = score(s);
  const res = step(s, 'wait');
  assert.equal(res.reward, 100);
  assert.equal(s.ufo, null);
  assert.equal(score(s), prevScore + 100);
});

test('bunker segment absorbs bomb and loses HP', () => {
  const s = createState(404);
  const seg = s.bunkers[0][0];
  assert.equal(seg.hp, 3);

  s.bombs = [{ x: seg.x, y: seg.y - 2, vy: 5 }];
  step(s, 'wait');

  assert.equal(seg.hp, 2);
  assert.equal(s.bombs.length, 0); // absorbed
});

test('alien bomb striking player deducts a life', () => {
  const s = createState(404);
  s.bombs = [{ x: s.player.x, y: s.player.y - 2, vy: 5 }];

  const res = step(s, 'wait');
  assert.ok(res.reward < 0);
  assert.equal(s.player.lives, 2);
});

test('losing all lives ends game', () => {
  const s = createState(404);
  s.player.lives = 1;
  s.bombs = [{ x: s.player.x, y: s.player.y - 2, vy: 5 }];

  step(s, 'wait');
  assert.equal(s.player.lives, 0);
  assert.equal(isOver(s), true);
});

test('invader reaching breach threshold ends game', () => {
  const s = createState(404);
  s.invaders[0].y = 485;
  s.breached = true;
  assert.equal(isOver(s), true);
});

test('illegal action throws without mutating state', () => {
  const s = createState(404);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'invalid_action');
  });

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions produce strictly deterministic state', () => {
  const s1 = createState(9001);
  const s2 = createState(9001);

  for (let i = 0; i < 25; i++) {
    const a1 = legalActions(s1);
    const a2 = legalActions(s2);
    assert.deepEqual(a1, a2);
    if (a1.length === 0) break;

    const chosen = a1[i % a1.length];
    step(s1, chosen);
    step(s2, chosen);
    assert.deepEqual(s1, s2);
  }
});
