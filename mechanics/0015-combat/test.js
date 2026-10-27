const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes fighter with 100 HP, 100 stamina, high stance, against Ring 1 brawlers', () => {
  const state = logic.createState(99);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.stamina, 100);
  assert.equal(state.player.stance, 'high');
  assert.equal(state.ring, 1);
  assert.equal(state.enemies.length, 2);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('shift_stance toggles between high and low stance', () => {
  const state = logic.createState(99);
  assert.equal(state.player.stance, 'high');
  const res = logic.step(state, 'shift_stance');
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
  assert.equal(state.player.stance, 'low');
  assert.ok(logic.legalActions(state).includes('sweep'));
  assert.ok(!logic.legalActions(state).includes('heavy_kick'));

  logic.step(state, 'shift_stance');
  assert.equal(state.player.stance, 'high');
  assert.ok(logic.legalActions(state).includes('heavy_kick'));
  assert.ok(!logic.legalActions(state).includes('sweep'));
});

test('jab hits nearest opponent, costs 5 stamina, and builds combo streak', () => {
  const state = logic.createState(99);
  state.player.x = 200;
  state.enemies[0].x = 255; // Within jab reach 65, outside enemy reach 45
  const initialEnemyHp = state.enemies[0].hp;

  logic.step(state, 'jab');
  assert.equal(state.player.stamina, 95);
  assert.equal(state.player.combo, 1);
  assert.ok(state.enemies[0].hp < initialEnemyHp);
});

test('heavy_kick in high stance deals massive damage and knocks back target', () => {
  const state = logic.createState(99);
  state.player.x = 200;
  state.enemies[0].x = 240;
  state.enemies[0].hp = 50;

  logic.step(state, 'heavy_kick');
  assert.equal(state.player.stamina, 85);
  assert.ok(state.enemies[0].hp <= 26);
  assert.ok(state.enemies[0].x > 240); // Knockback
});

test('sweep in low stance deals damage and stuns opponent', () => {
  const state = logic.createState(99);
  state.player.stance = 'low';
  state.player.x = 200;
  state.enemies[0].x = 240;
  state.enemies[0].hp = 50;

  logic.step(state, 'sweep');
  assert.equal(state.player.stamina, 88);
  assert.ok(state.enemies[0].hp <= 34);
  assert.ok(state.enemies[0].stunned >= 1);
});

test('grab_throw grapples close opponent, throws them back, and splashes second enemy', () => {
  const state = logic.createState(99);
  state.player.x = 200;
  state.enemies[0].x = 230; // Close range
  state.enemies[1].x = 270;
  state.enemies[0].hp = 60;
  state.enemies[1].hp = 40;

  assert.ok(logic.legalActions(state).includes('grab_throw'));
  logic.step(state, 'grab_throw');
  assert.equal(state.player.stamina, 80);
  assert.ok(state.enemies[0].hp < 30);
  assert.ok(state.enemies[1].hp < 40); // Splash damage
});

test('counter_parry deflects incoming attack, stuns opponent, and counters with 35 damage', () => {
  const state = logic.createState(99);
  state.player.hp = 100;
  state.player.x = 200;
  state.enemies = [
    { id: 'brawler', type: 'brawler', x: 235, hp: 50, maxHp: 50, damage: 15, stunned: 0, windup: 0 }
  ];

  logic.step(state, 'counter_parry');
  assert.equal(state.player.hp, 100); // Damage negated!
  assert.equal(state.enemies[0].hp, 15); // Took 35 counter damage
  assert.ok(state.enemies[0].stunned >= 1);
});

test('dodge retreats position and evades incoming strikes', () => {
  const state = logic.createState(99);
  state.player.hp = 100;
  state.player.x = 200;
  state.enemies = [
    { id: 'brawler', type: 'brawler', x: 235, hp: 50, maxHp: 50, damage: 15, stunned: 0, windup: 0 }
  ];

  logic.step(state, 'dodge');
  assert.equal(state.player.hp, 100); // Evaded!
  assert.equal(state.player.x, 180); // Stepped back
});

test('breathe recovers 40 stamina up to 100 maximum', () => {
  const state = logic.createState(99);
  state.player.stamina = 30;
  logic.step(state, 'breathe');
  assert.equal(state.player.stamina, 70);
  logic.step(state, 'breathe');
  assert.equal(state.player.stamina, 100);
});

test('clearing Ring 1 advances to Ring 2 with HP recovery and refreshed stamina', () => {
  const state = logic.createState(99);
  state.ring = 1;
  state.player.hp = 60;
  state.player.x = 200;
  state.enemies = [
    { id: 'last_brawler', type: 'brawler', x: 230, hp: 10, maxHp: 30, damage: 0, stunned: 0, windup: 0 }
  ];

  logic.step(state, 'jab');
  assert.equal(state.ring, 2);
  assert.equal(state.player.hp, 95);
  assert.equal(state.player.stamina, 100);
  assert.ok(state.enemies.length >= 2);
});

test('slaying Pit Champion in Ring 3 achieves victory with 3000 bonus points', () => {
  const state = logic.createState(99);
  state.ring = 3;
  state.player.x = 200;
  state.enemies = [
    { id: 'boss', type: 'champion', x: 230, hp: 10, maxHp: 120, damage: 0, stunned: 0, windup: 0 }
  ];

  logic.step(state, 'jab');
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.ok(state.scoreVal >= 3000);
});

test('player defeat terminates game with state.lost = true', () => {
  const state = logic.createState(99);
  state.player.hp = 5;
  state.player.x = 200;
  state.enemies = [
    { id: 'brawler', type: 'brawler', x: 230, hp: 50, maxHp: 50, damage: 20, stunned: 0, windup: 0 }
  ];

  logic.step(state, 'breathe');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
  assert.deepEqual(logic.legalActions(state), []);
});
