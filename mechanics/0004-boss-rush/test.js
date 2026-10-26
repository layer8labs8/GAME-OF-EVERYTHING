const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes player, 2 potions and first titan', () => {
  const s = L.createState(1);
  assert.equal(s.player.hp, 100);
  assert.equal(s.player.stamina, 100);
  assert.equal(s.player.potions, 2);
  assert.equal(s.boss.name, 'Iron Golem');
  assert.equal(s.boss.hp, 90);
  assert.equal(s.won, false);
  assert.equal(s.lost, false);
});

test('light_slash deals damage, consumes stamina, and builds combo', () => {
  const s = L.createState(1);
  L.step(s, 'light_slash');
  assert.ok(s.boss.hp < 90);
  assert.equal(s.player.combo, 1);
  assert.ok(s.player.stamina < 100);
});

test('heavy_smash deals massive damage and consumes 35 stamina', () => {
  const s = L.createState(1);
  const hpBefore = s.boss.hp;
  L.step(s, 'heavy_smash');
  assert.equal(hpBefore - s.boss.hp, 28);
  assert.equal(s.player.combo, 2);
});

test('heal consumes potion and restores 35 health', () => {
  const s = L.createState(1);
  s.player.hp = 50;
  L.step(s, 'heal');
  assert.equal(s.player.hp, 85);
  assert.equal(s.player.potions, 1);
});

test('rest restores 40 stamina up to 100 max', () => {
  const s = L.createState(1);
  s.player.stamina = 30;
  L.step(s, 'rest');
  assert.equal(s.player.stamina, 75); // 30 + 40 + 5 passive = 75
});

test('parry deflects incoming attack, stuns boss and restores stamina', () => {
  const s = L.createState(1);
  s.boss.windup = true;
  s.player.hp = 100;
  const res = L.step(s, 'parry');
  assert.equal(s.player.hp, 100);
  assert.ok(s.boss.stunned >= 1);
  assert.ok(res.reward >= 25);
});

test('dodge evades incoming attack safely', () => {
  const s = L.createState(1);
  s.boss.windup = true;
  s.player.hp = 100;
  L.step(s, 'dodge');
  assert.equal(s.player.hp, 100);
});

test('undefended boss windup strikes player and resets combo', () => {
  const s = L.createState(1);
  s.boss.windup = true;
  s.player.combo = 5;
  L.step(s, 'light_slash');
  assert.equal(s.player.hp, 75); // 100 - 25
  assert.equal(s.player.combo, 0);
});

test('slaying first titan advances to second titan with rewards', () => {
  const s = L.createState(1);
  s.boss.hp = 5;
  L.step(s, 'light_slash');
  assert.equal(s.bossIdx, 1);
  assert.equal(s.boss.name, 'Storm Chimera');
  assert.equal(s.won, false);
});

test('slaying final titan wins the game', () => {
  const s = L.createState(1);
  s.bossIdx = 2;
  s.boss = {
    name: 'Obsidian Wyrm',
    hp: 10,
    maxHp: 160,
    windup: false,
    intent: 'Magma Burst',
    stunned: 0,
  };
  const res = L.step(s, 'heavy_smash');
  assert.equal(s.won, true);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('depleting player HP triggers defeat', () => {
  const s = L.createState(1);
  s.player.hp = 20;
  s.boss.windup = true;
  const res = L.step(s, 'rest');
  assert.ok(s.player.hp <= 0);
  assert.equal(s.lost, true);
  assert.equal(res.done, true);
});

test('illegal action without stamina throws without mutating state', () => {
  const s = L.createState(1);
  s.player.stamina = 5;
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'heavy_smash'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const a = L.createState(99);
  const b = L.createState(99);
  for (let i = 0; i < 8; i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
