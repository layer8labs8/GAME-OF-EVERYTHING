const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes knight, 3 flasks, and Ember Lord boss', () => {
  const state = logic.createState(42);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.stamina, 100);
  assert.equal(state.player.flasks, 3);
  assert.equal(state.boss.hp, 250);
  assert.equal(state.boss.phase, 1);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('heavy_thrust consumes 30 stamina, deals 32 damage and 35 poise damage', () => {
  const state = logic.createState(42);
  const res = logic.step(state, 'heavy_thrust');
  assert.equal(state.boss.hp, 218);
  assert.equal(state.boss.poise, 65);
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
});

test('depleting poise triggers boss stagger opening for visceral strike', () => {
  const state = logic.createState(42);
  state.boss.poise = 20;

  logic.step(state, 'heavy_thrust');
  assert.ok(state.boss.staggered > 0);
  assert.ok(logic.legalActions(state).includes('visceral_strike'));

  const hpBeforeVisceral = state.boss.hp;
  logic.step(state, 'visceral_strike');
  assert.equal(state.boss.hp, hpBeforeVisceral - 65);
});

test('dodge_roll evades telegraphed boss attack safely', () => {
  const state = logic.createState(42);
  state.boss.windup = 2; // Leap slam windup

  logic.step(state, 'dodge_roll');
  assert.equal(state.player.hp, 100); // 0 damage taken
  assert.equal(state.boss.windup, 0);
});

test('parry deflects telegraphed strike and damages poise', () => {
  const state = logic.createState(42);
  state.boss.windup = 1;
  const initialPoise = state.boss.poise;

  logic.step(state, 'parry');
  assert.equal(state.player.hp, 100);
  assert.equal(state.boss.poise, initialPoise - 50);
});

test('block mitigates 75% incoming damage', () => {
  const state = logic.createState(42);
  state.boss.windup = 1; // 20 damage cleave

  logic.step(state, 'block');
  assert.equal(state.player.hp, 95); // 20 * 0.25 = 5 damage taken
});

test('heal consumes 1 flask and restores 40 HP', () => {
  const state = logic.createState(42);
  state.player.hp = 50;

  logic.step(state, 'heal');
  assert.equal(state.player.hp, 90);
  assert.equal(state.player.flasks, 2);
});

test('boss reaching 125 HP triggers Phase 2 transformation', () => {
  const state = logic.createState(42);
  state.boss.hp = 130;

  logic.step(state, 'heavy_thrust');
  assert.ok(state.boss.hp <= 125);
  assert.equal(state.boss.phase, 2);
});

test('slaying boss achieves victory', () => {
  const state = logic.createState(42);
  state.boss.hp = 10;

  logic.step(state, 'light_slash');
  assert.equal(state.boss.hp, 0);
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.equal(logic.legalActions(state).length, 0);
});

test('depleting player HP triggers defeat', () => {
  const state = logic.createState(42);
  state.player.hp = 15;
  state.boss.windup = 2; // 30 damage leap slam

  logic.step(state, 'rest');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(42);
  state.player.flasks = 0;
  assert.throws(() => logic.step(state, 'heal'), /Illegal action/);
  assert.equal(state.player.flasks, 0);
});

test('same seed and actions yield strictly deterministic state', () => {
  const actions = ['heavy_thrust', 'dodge_roll', 'light_slash', 'rest', 'parry'];
  const s1 = logic.createState(777);
  const s2 = logic.createState(777);

  for (const act of actions) {
    if (logic.legalActions(s1).includes(act)) {
      logic.step(s1, act);
      logic.step(s2, act);
    }
  }
  assert.deepEqual(s1, s2);
});
