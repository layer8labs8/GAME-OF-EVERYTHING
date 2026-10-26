const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes player, 100 HP, and 2 initial thugs', () => {
  const s = L.createState(1);
  assert.equal(s.player.hp, 100);
  assert.equal(s.player.lane, 1);
  assert.equal(s.enemies.length, 2);
  assert.equal(s.thugsRemaining, 6);
  assert.equal(s.won, false);
  assert.equal(s.lost, false);
});

test('moving shifts x and shifting lane updates depth lane', () => {
  const s = L.createState(1);
  L.step(s, 'right');
  assert.equal(s.player.x, 80);
  L.step(s, 'lane_up');
  assert.equal(s.player.lane, 0);
  L.step(s, 'lane_down');
  assert.equal(s.player.lane, 1);
});

test('punch hits thugs on same lane and charges super meter', () => {
  const s = L.createState(1);
  s.enemies[0].x = s.player.x + 20;
  s.enemies[0].lane = s.player.lane;
  const hpBefore = s.enemies[0].hp;
  const superBefore = s.player.superGauge;
  L.step(s, 'punch');
  assert.ok(s.enemies[0].hp < hpBefore);
  assert.ok(s.player.superGauge > superBefore);
  assert.equal(s.player.combo, 1);
});

test('jump kick hits enemies on adjacent depth lanes', () => {
  const s = L.createState(1);
  s.player.lane = 1;
  s.enemies[0].x = s.player.x + 25;
  s.enemies[0].lane = 2; // adjacent lane
  const hpBefore = s.enemies[0].hp;
  L.step(s, 'jump_kick');
  assert.equal(hpBefore - s.enemies[0].hp, 22);
});

test('super dragon uppercut consumes 50 gauge and hits nearby foes', () => {
  const s = L.createState(1);
  s.player.superGauge = 60;
  assert.ok(L.legalActions(s).includes('super'));
  s.enemies[0].hp = 80;
  s.enemies[0].x = s.player.x + 30;
  const hpBefore = s.enemies[0].hp;
  L.step(s, 'super');
  assert.equal(hpBefore - s.enemies[0].hp, 45);
  assert.equal(s.player.superGauge, 10);
});

test('picking street food restores 30 player health', () => {
  const s = L.createState(1);
  s.player.hp = 60;
  s.items.push({ id: 100, x: s.player.x + 10, lane: s.player.lane });
  assert.ok(L.legalActions(s).includes('pick_food'));
  L.step(s, 'pick_food');
  assert.equal(s.player.hp, 90);
  assert.equal(s.items.length, 0);
});

test('slaying all 8 thugs achieves victory', () => {
  const s = L.createState(1);
  s.thugsDefeated = 7;
  s.thugsRemaining = 0;
  s.enemies = [{ id: 99, x: s.player.x + 20, lane: s.player.lane, hp: 10, attackCooldown: 2 }];
  const res = L.step(s, 'punch');
  assert.equal(s.won, true);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('depleting player HP triggers defeat', () => {
  const s = L.createState(1);
  s.player.hp = 10;
  s.enemies = [{ id: 1, x: s.player.x + 15, lane: s.player.lane, hp: 40, attackCooldown: 0 }];
  const res = L.step(s, 'wait');
  assert.equal(s.player.hp, 0);
  assert.equal(s.lost, true);
  assert.equal(res.done, true);
});

test('illegal action without super gauge throws without mutating state', () => {
  const s = L.createState(1);
  s.player.superGauge = 20;
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'super'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const a = L.createState(333);
  const b = L.createState(333);
  for (let i = 0; i < 10; i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
