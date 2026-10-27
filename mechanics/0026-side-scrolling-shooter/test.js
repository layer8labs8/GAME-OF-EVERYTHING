const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes fighter at (60, 200), 100 HP, 3 missiles, 2 shields, wave 1', () => {
  const state = logic.createState(77);
  assert.equal(state.player.x, 60);
  assert.equal(state.player.y, 200);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.missiles, 3);
  assert.equal(state.player.shields, 2);
  assert.equal(state.wave, 1);
  assert.equal(state.enemies.length, 3);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('movement updates coordinates and clamps within arena bounds', () => {
  const state = logic.createState(77);
  const initialY = state.player.y;

  const res = logic.step(state, 'move_up');
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
  assert.equal(state.player.y, initialY - 28);

  logic.step(state, 'move_forward');
  assert.equal(state.player.x, 60 + 28);
});

test('fire spawns twin plasma bolts travelling eastward', () => {
  const state = logic.createState(77);
  const initialProjectiles = state.projectiles.length;

  logic.step(state, 'fire');
  const playerBolts = state.projectiles.filter(p => p.owner === 'player');
  assert.ok(playerBolts.length >= 2);
  assert.equal(playerBolts[0].vx, 45);
});

test('missile consumes 1 missile, tracks target and deals 45 damage', () => {
  const state = logic.createState(77);
  state.player.missiles = 1;
  state.player.x = 200;
  state.player.y = 200;
  state.enemies = [
    { id: 'target_ship', type: 'corvette', x: 250, y: 200, hp: 60, maxHp: 60, speed: 0, damage: 0, cooldown: 5 }
  ];

  assert.ok(logic.legalActions(state).includes('missile'));
  logic.step(state, 'missile');
  assert.equal(state.player.missiles, 0);

  // Advance simulation to let missile hit target
  logic.step(state, 'rest');
  const enemy = state.enemies.find(e => e.id === 'target_ship');
  assert.ok(enemy);
  assert.equal(enemy.hp, 15); // Took 45 damage
});

test('barrier_shield sets 2 turns of invulnerability and absorbs enemy projectile hits', () => {
  const state = logic.createState(77);
  state.player.hp = 100;
  state.player.x = 100;
  state.player.y = 200;
  state.player.shields = 2;
  state.enemies = [
    { id: 'dummy', type: 'scout', x: 380, y: 10, hp: 100, maxHp: 100, speed: 0, damage: 0, cooldown: 99 }
  ];
  state.projectiles = [
    { id: 'incoming', x: 120, y: 200, vx: -20, vy: 0, damage: 30, owner: 'enemy' }
  ];

  assert.ok(logic.legalActions(state).includes('barrier_shield'));
  logic.step(state, 'barrier_shield');
  assert.equal(state.player.shields, 1);
  assert.equal(state.player.hp, 100); // 30 damage absorbed safely!
});

test('rest restores 10 HP up to 100 maximum', () => {
  const state = logic.createState(77);
  state.player.hp = 75;
  state.enemies = [
    { id: 'dummy', type: 'scout', x: 380, y: 10, hp: 100, maxHp: 100, speed: 0, damage: 0, cooldown: 99 }
  ];
  logic.step(state, 'rest');
  assert.equal(state.player.hp, 85);
  logic.step(state, 'rest');
  logic.step(state, 'rest');
  assert.equal(state.player.hp, 100);
});

test('clearing wave 1 advances to wave 2 with HP recovery and refreshed ordnance', () => {
  const state = logic.createState(77);
  state.wave = 1;
  state.player.hp = 60;
  state.player.missiles = 0;
  state.player.shields = 0;
  state.enemies = [
    { id: 'last_scout', type: 'scout', x: 120, y: 200, hp: 10, maxHp: 15, speed: 0, damage: 0, cooldown: 5 }
  ];
  state.player.x = 50;
  state.player.y = 200;

  logic.step(state, 'fire');
  assert.equal(state.wave, 2);
  assert.equal(state.player.hp, 90);
  assert.ok(state.player.missiles > 0);
  assert.ok(state.player.shields > 0);
  assert.ok(state.enemies.length >= 2);
});

test('destroying Void Dreadnought in wave 3 achieves victory', () => {
  const state = logic.createState(77);
  state.wave = 3;
  state.enemies = [
    { id: 'boss', type: 'dreadnought', x: 120, y: 200, hp: 10, maxHp: 120, speed: 0, damage: 0, cooldown: 5 }
  ];
  state.player.x = 50;
  state.player.y = 200;

  logic.step(state, 'fire');
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.ok(state.scoreVal >= 3500);
});

test('depleting player HP triggers defeat', () => {
  const state = logic.createState(77);
  state.player.hp = 5;
  state.projectiles = [
    { id: 'lethal', x: 75, y: 200, vx: -20, vy: 0, damage: 20, owner: 'enemy' }
  ];
  state.enemies = [];

  logic.step(state, 'rest');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
  assert.deepEqual(logic.legalActions(state), []);
});
