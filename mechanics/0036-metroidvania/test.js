const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes operative at (50, 340), 100 HP, in Sector 1', () => {
  const state = logic.createState(36);
  assert.equal(state.player.x, 50);
  assert.equal(state.player.y, 340);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.missiles, 0);
  assert.equal(state.player.hasMissileUpgrade, false);
  assert.equal(state.player.hasDoubleJump, false);
  assert.equal(state.player.hasPhaseDash, false);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('movement is blocked by closed red door before missile unlock', () => {
  const state = logic.createState(36);
  state.player.x = 175;
  state.player.y = 340;
  state.gates.find(g => g.id === 'door_red').open = false;

  logic.step(state, 'move_right');
  // Trapped by door at 180
  assert.equal(state.player.x, 175);
});

test('collecting missile upgrade grants missiles and enables missile action', () => {
  const state = logic.createState(36);
  state.player.x = 110;
  state.player.y = 340;

  logic.step(state, 'move_right');
  assert.equal(state.player.hasMissileUpgrade, true);
  assert.equal(state.player.missiles, 3);
  assert.ok(logic.legalActions(state).includes('missile'));
});

test('missile destroys red blast door and unlocks passage to Sector 2', () => {
  const state = logic.createState(36);
  state.player.x = 160;
  state.player.y = 340;
  state.player.facing = 1;
  state.player.missiles = 1;

  logic.step(state, 'missile');
  const door = state.gates.find(g => g.id === 'door_red');
  assert.equal(door.open, true);
  assert.equal(state.player.missiles, 0);

  // Now player can pass through
  logic.step(state, 'move_right');
  assert.ok(state.player.x > 180);
});

test('double jump allows scaling vertical shaft to reach Sector 3', () => {
  const state = logic.createState(36);
  state.player.x = 330;
  state.player.y = 340;
  state.player.hasDoubleJump = false;

  // Single jump cannot reach upper ruins
  logic.step(state, 'jump');
  assert.equal(state.player.y, 340);

  // Unlock double jump
  state.player.hasDoubleJump = true;
  logic.step(state, 'jump');
  assert.equal(state.player.y, 180); // Scaled shaft!
});

test('phase dash allows penetrating laser gate to reach Sector 4', () => {
  const state = logic.createState(36);
  state.player.x = 190;
  state.player.y = 180;
  state.player.facing = -1;
  state.player.hasPhaseDash = true;

  assert.ok(logic.legalActions(state).includes('dash'));
  logic.step(state, 'dash');
  assert.ok(state.player.x <= 160);
  const laser = state.gates.find(g => g.id === 'laser_gate');
  assert.equal(laser.open, true);
});

test('beam fire damages enemies in line of sight', () => {
  const state = logic.createState(36);
  state.player.x = 60;
  state.player.y = 340;
  state.player.facing = 1;
  state.enemies = [
    { id: 'dummy', type: 'crawler', x: 120, y: 340, hp: 20, maxHp: 20, speed: 0, damage: 0, facing: -1 }
  ];

  logic.step(state, 'fire');
  const enemy = state.enemies.find(e => e.id === 'dummy');
  assert.ok(enemy);
  assert.equal(enemy.hp, 5); // Took 15 damage
});

test('rest restores 15 HP up to 100 maximum', () => {
  const state = logic.createState(36);
  state.player.hp = 70;
  state.enemies = []; // prevent attack damage
  logic.step(state, 'rest');
  assert.equal(state.player.hp, 85);
  logic.step(state, 'rest');
  assert.equal(state.player.hp, 100);
});

test('destroying Core Guardian in Sector 4 achieves victory', () => {
  const state = logic.createState(36);
  state.player.x = 60;
  state.player.y = 140;
  state.player.facing = 1;
  state.enemies = [
    { id: 'boss', type: 'guardian', x: 90, y: 140, hp: 10, maxHp: 120, speed: 0, damage: 0, cooldown: 5 }
  ];

  logic.step(state, 'fire');
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.ok(state.scoreVal >= 2000);
});

test('depleting player HP triggers defeat', () => {
  const state = logic.createState(36);
  state.player.hp = 5;
  state.player.x = 100;
  state.player.y = 340;
  state.enemies = [
    { id: 'striker', type: 'crawler', x: 105, y: 340, hp: 20, maxHp: 20, speed: 0, damage: 20, facing: -1 }
  ];

  logic.step(state, 'rest');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
  assert.deepEqual(logic.legalActions(state), []);
});
