const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState starts with zero coins and only tap legal', () => {
  const s = L.createState(1);
  assert.equal(s.coins, 0);
  assert.equal(L.score(s), 0);
  assert.deepEqual(L.legalActions(s), ['tap']);
});

test('tapping mints coins and unlocks upgrades once affordable', () => {
  const s = L.createState(5);
  for (let i = 0; i < 12; i++) L.step(s, 'tap');
  assert.ok(s.coins >= 12);
  assert.ok(L.legalActions(s).includes('up_tap'));
});

test('buying hammer and bellows increases tapPower and autoRate without lowering score', () => {
  const s = L.createState(9);
  s.coins = 50;
  s.totalMinted = 50;
  L.step(s, 'up_tap');
  assert.equal(s.tapLevel, 1);
  assert.equal(L.tapPower(s), 3);
  assert.equal(L.score(s), 50);

  L.step(s, 'up_auto');
  assert.equal(s.autoLevel, 1);
  assert.equal(L.autoRate(s), 2);
  assert.equal(L.score(s), 52); // passive income fires on purchase step
  assert.ok(L.legalActions(s).includes('tick'));
});

test('blast furnace multiplier scales both tapPower and autoRate', () => {
  const s = L.createState(12);
  s.tapLevel = 1; // base 3
  s.autoLevel = 2; // base 4
  s.coins = 60;
  L.step(s, 'up_mult');
  assert.equal(s.multLevel, 1);
  assert.equal(L.tapPower(s), 6);
  assert.equal(L.autoRate(s), 8);
});

test('shift ends cleanly at MAX_TURNS = 150', () => {
  const s = L.createState(3);
  let last = null;
  for (let i = 0; i < L.MAX_TURNS; i++) {
    last = L.step(s, 'tap');
  }
  assert.equal(last.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal unaffordable upgrade throws without mutating state', () => {
  const s = L.createState(7);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'up_mult'), /illegal/i);
  assert.throws(() => L.step(s, 'tick'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions produce identical state', () => {
  const a = L.createState(44);
  const b = L.createState(44);
  for (let i = 0; i < 20; i++) {
    const acts = L.legalActions(a);
    const act = acts[acts.length - 1];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
