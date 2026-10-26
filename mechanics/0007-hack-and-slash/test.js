const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes player, 100 HP, 100 stamina, and wave 1 grunts', () => {
  const state = logic.createState(42);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.stamina, 100);
  assert.equal(state.wave, 1);
  assert.equal(state.enemies.length, 3);
  assert.equal(state.enemies[0].type, 'grunt');
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('move_right shifts player position and orients facing direction', () => {
  const state = logic.createState(42);
  const initialX = state.player.x;
  const res = logic.step(state, 'move_right');
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
  assert.equal(state.player.x, initialX + 30);
  assert.equal(state.player.facing, 1);
});

test('jump sets airborne state and air_slash attacks while landing', () => {
  const state = logic.createState(42);
  logic.step(state, 'jump');
  assert.equal(state.player.isAirborne, true);
  assert.ok(logic.legalActions(state).includes('air_slash'));

  logic.step(state, 'air_slash');
  assert.equal(state.player.isAirborne, false);
  assert.equal(state.player.y, 320);
});

test('slash performs 3-stage combo with escalating damage and combo multiplier', () => {
  const state = logic.createState(42);
  state.player.x = 220;
  state.player.facing = 1;
  state.enemies = [{ id: 'target', type: 'grunt', x: 250, y: 320, hp: 120, maxHp: 120, speed: 0, damage: 10, windup: 0, stunned: 5, facing: -1 }];
  const initialEnemyHp = state.enemies[0].hp;

  logic.step(state, 'slash');
  assert.equal(state.player.combo, 1);
  assert.ok(state.enemies[0].hp < initialEnemyHp);

  const hpAfterSlash1 = state.enemies[0].hp;
  logic.step(state, 'slash');
  assert.equal(state.player.combo, 2);
  assert.ok(state.enemies[0].hp < hpAfterSlash1);

  logic.step(state, 'slash');
  assert.equal(state.player.combo, 3);
});

test('dash_strike consumes 25 stamina and pierces across distance', () => {
  const state = logic.createState(42);
  state.player.x = 100;
  state.player.facing = 1;
  state.player.stamina = 50;

  logic.step(state, 'dash_strike');
  assert.equal(state.player.x, 200);
  assert.equal(state.player.stamina, 25);
});

test('parry deflects telegraphed enemy strike, counters, and protects HP', () => {
  const state = logic.createState(42);
  state.player.x = 220;
  state.enemies[0].x = 240;
  state.enemies[0].windup = 1;

  logic.step(state, 'parry');
  assert.equal(state.player.hp, 100);
  assert.ok(state.enemies[0].stunned > 0);
});

test('slaying wave enemies advances to wave 2 with stat recovery', () => {
  const state = logic.createState(42);
  state.player.hp = 80;
  state.enemies = [{ id: 'e1', type: 'grunt', x: 70, y: 320, hp: 5, maxHp: 30, speed: 5, damage: 10, windup: 0, stunned: 0, facing: -1 }];
  logic.step(state, 'slash');

  assert.equal(state.wave, 2);
  assert.equal(state.player.hp, 100);
  assert.ok(state.enemies.length > 0);
});

test('clearing final wave triggers victory', () => {
  const state = logic.createState(42);
  state.wave = 5;
  state.enemies = [{ id: 'e_final', type: 'knight', x: 70, y: 320, hp: 5, maxHp: 90, speed: 5, damage: 10, windup: 0, stunned: 0, facing: -1 }];
  logic.step(state, 'slash');

  assert.equal(state.victory, true);
  assert.equal(logic.isOver(state), true);
  assert.equal(logic.legalActions(state).length, 0);
});

test('depleting player HP triggers defeat', () => {
  const state = logic.createState(42);
  state.player.hp = 5;
  state.player.x = 240;
  state.enemies[0].x = 245;
  state.enemies[0].windup = 1;

  logic.step(state, 'idle');
  assert.equal(state.player.hp, 0);
  assert.equal(state.defeated, true);
  assert.equal(logic.isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(42);
  state.player.stamina = 0;
  assert.throws(() => logic.step(state, 'dash_strike'), /Illegal action/);
  assert.equal(state.player.stamina, 0);
});

test('same seed and actions yield strictly deterministic state', () => {
  const actions = ['move_right', 'slash', 'jump', 'air_slash', 'rest', 'parry'];
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
