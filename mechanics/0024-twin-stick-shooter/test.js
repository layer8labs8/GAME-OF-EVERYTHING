const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes ship at center, 100 HP, 2 bombs, and wave 1 seekers', () => {
  const state = logic.createState(42);
  assert.equal(state.player.x, 200);
  assert.equal(state.player.y, 200);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.bombs, 2);
  assert.equal(state.wave, 1);
  assert.equal(state.enemies.length, 4);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('move_n shifts player upward within boundaries', () => {
  const state = logic.createState(42);
  const initialY = state.player.y;
  const res = logic.step(state, 'move_n');
  assert.equal(state.player.y, initialY - 25);
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
});

test('fire_n and fire_ne spawn directional projectiles', () => {
  const state = logic.createState(42);
  logic.step(state, 'fire_n');
  assert.equal(state.projectiles.length, 1);
  assert.equal(state.projectiles[0].owner, 'player');
  assert.equal(state.projectiles[0].vy, -30);

  logic.step(state, 'fire_ne');
  assert.equal(state.projectiles.length, 2);
  assert.ok(state.projectiles[1].vx > 0);
  assert.ok(state.projectiles[1].vy < 0);
});

test('player projectile hits enemy and inflicts damage', () => {
  const state = logic.createState(42);
  state.enemies = [{ id: 'target', type: 'seeker', x: 200, y: 150, hp: 30, maxHp: 30, speed: 0, damage: 0, cooldown: 1 }];
  const initialScore = state.scoreVal;

  logic.step(state, 'fire_n');
  assert.ok(state.enemies[0].hp < 30);
  assert.ok(state.scoreVal > initialScore);
});

test('bomb clears enemy projectiles and deals 45 area damage', () => {
  const state = logic.createState(42);
  state.projectiles = [{ id: 'ep1', x: 200, y: 180, vx: 0, vy: 5, damage: 10, owner: 'enemy' }];
  state.enemies = [{ id: 'target', type: 'turret', x: 200, y: 100, hp: 60, maxHp: 60, speed: 0, damage: 0, cooldown: 1 }];

  logic.step(state, 'bomb');
  assert.equal(state.player.bombs, 1);
  assert.equal(state.projectiles.length, 0); // Enemy projectile cleared
  assert.equal(state.enemies[0].hp, 15); // 60 - 45
});

test('slaying wave enemies advances to wave 2 with HP recovery', () => {
  const state = logic.createState(42);
  state.player.hp = 80;
  state.enemies = []; // All enemies destroyed
  logic.step(state, 'wait');

  assert.equal(state.wave, 2);
  assert.equal(state.player.hp, 100);
  assert.ok(state.enemies.length > 0);
});

test('clearing final wave triggers victory', () => {
  const state = logic.createState(42);
  state.wave = 5;
  state.enemies = [];
  logic.step(state, 'wait');

  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.equal(logic.legalActions(state).length, 0);
});

test('depleting player HP triggers defeat', () => {
  const state = logic.createState(42);
  state.player.hp = 10;
  state.player.x = 200;
  state.player.y = 200;
  state.enemies = [{ id: 'mine', type: 'mine', x: 200, y: 200, hp: 50, maxHp: 50, speed: 0, damage: 25, cooldown: 1 }];

  logic.step(state, 'wait');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(42);
  state.player.bombs = 0;
  assert.throws(() => logic.step(state, 'bomb'), /Illegal action/);
  assert.equal(state.player.bombs, 0);
});

test('same seed and actions yield strictly deterministic state', () => {
  const actions = ['move_n', 'fire_ne', 'move_e', 'fire_e', 'wait', 'bomb'];
  const s1 = logic.createState(1234);
  const s2 = logic.createState(1234);

  for (const act of actions) {
    if (logic.legalActions(s1).includes(act)) {
      logic.step(s1, act);
      logic.step(s2, act);
    }
  }
  assert.deepEqual(s1, s2);
});
