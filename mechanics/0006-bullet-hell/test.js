const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes player, 3 lives, and Crimson Core boss', () => {
  const s = L.createState(1);
  assert.equal(s.player.x, 180);
  assert.equal(s.player.y, 440);
  assert.equal(s.player.lives, 3);
  assert.equal(s.boss.hp, 150);
  assert.equal(s.won, false);
  assert.equal(s.lost, false);
});

test('moving shifts player position and focus moves at half speed', () => {
  const s = L.createState(1);
  const startX = s.player.x;
  L.step(s, 'left');
  assert.equal(startX - s.player.x, 16);

  L.step(s, 'focus_right');
  assert.equal(s.player.x - (startX - 16), 8);
});

test('player auto-cannons damage boss on hit', () => {
  const s = L.createState(1);
  s.player.x = s.boss.x;
  s.player.y = 140; // close range for rapid contact
  for (let i = 0; i < 4; i++) {
    L.step(s, 'wait');
  }
  assert.ok(s.boss.hp < 150);
  assert.ok(s.score > 0);
});

test('grazing bullets increases grazeCount, charges bomb meter, and scores bonus', () => {
  const s = L.createState(1);
  // Place bullet at graze distance (12 px away from player core)
  s.bullets.push({
    x: s.player.x + 12,
    y: s.player.y,
    vx: 0,
    vy: 0,
    grazed: false,
    color: '#f43f5e',
  });
  const res = L.step(s, 'wait');
  assert.ok(s.grazeCount >= 1);
  assert.ok(s.bombMeter >= 6);
  assert.ok(res.reward >= 5);
});

test('direct hit on core deducts life and sets invulnerability frames', () => {
  const s = L.createState(1);
  // Place bullet directly on player core
  s.bullets.push({
    x: s.player.x,
    y: s.player.y,
    vx: 0,
    vy: 0,
    grazed: false,
    color: '#f43f5e',
  });
  const res = L.step(s, 'wait');
  assert.equal(s.player.lives, 2);
  assert.ok(s.player.invuln > 0);
  assert.ok(res.reward < 0);
});

test('celestial bomb clears all screen bullets and deals 25 boss damage', () => {
  const s = L.createState(1);
  s.bombMeter = 100;
  assert.ok(L.legalActions(s).includes('bomb'));
  const hpBefore = s.boss.hp;
  L.step(s, 'bomb');
  assert.equal(hpBefore - s.boss.hp, 25);
  assert.equal(s.bullets.length, 0);
  assert.equal(s.bombMeter, 0);
});

test('reducing boss HP to 0 achieves victory', () => {
  const s = L.createState(1);
  s.boss.hp = 10;
  s.bombMeter = 100;
  const res = L.step(s, 'bomb');
  assert.equal(s.won, true);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('losing all lives triggers defeat', () => {
  const s = L.createState(1);
  s.player.lives = 1;
  s.bullets.push({
    x: s.player.x,
    y: s.player.y,
    vx: 0,
    vy: 0,
    grazed: false,
    color: '#f43f5e',
  });
  const res = L.step(s, 'wait');
  assert.equal(s.player.lives, 0);
  assert.equal(s.lost, true);
  assert.equal(res.done, true);
});

test('illegal bomb without meter throws without mutating state', () => {
  const s = L.createState(1);
  s.bombMeter = 50;
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'bomb'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions produce strictly deterministic bullet patterns', () => {
  const a = L.createState(777);
  const b = L.createState(777);
  for (let i = 0; i < 12; i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
