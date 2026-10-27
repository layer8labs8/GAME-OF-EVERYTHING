const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes operative with 100 HP, 12 ammo, 2 flashbangs, 2 breach charges', () => {
  const state = logic.createState(42);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.ammo, 12);
  assert.equal(state.player.flashbangs, 2);
  assert.equal(state.player.breachCharges, 2);
  assert.equal(state.hasCore, false);
  assert.equal(state.doors.length, 2);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('movement updates position and facing vector', () => {
  const state = logic.createState(42);
  const initialY = state.player.y;
  const res = logic.step(state, 'move_n');
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
  assert.equal(state.player.y, initialY - 24);
  assert.equal(state.player.facingX, 0);
  assert.equal(state.player.facingY, -1);
});

test('movement is blocked by unbreached blast doors', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.player.y = 280; // Right below door1 at y: 260
  state.doors[0].breached = false;

  logic.step(state, 'move_n');
  // Target y would be 256 which collides with door1 (y: 260 +- 7), so position stays 280
  assert.equal(state.player.y, 280);
});

test('fire consumes ammo, damages aligned enemy, and awards score', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.player.y = 350;
  state.player.facingX = 0;
  state.player.facingY = -1;
  state.player.ammo = 10;
  state.enemies = [
    { id: 'target_guard', type: 'guard', x: 200, y: 290, hp: 20, maxHp: 20, speed: 0, damage: 0, stunned: 0, facing: -1 }
  ];

  logic.step(state, 'fire');
  assert.equal(state.player.ammo, 9);
  // Target takes 25 damage and dies (hp <= 0), removed from enemies
  assert.equal(state.enemies.length, 0);
  assert.ok(state.scoreVal > 0);
});

test('reload restores magazine to full capacity', () => {
  const state = logic.createState(42);
  state.player.ammo = 3;
  logic.step(state, 'reload');
  assert.equal(state.player.ammo, 12);
});

test('flashbang stuns hostiles within blast radius for 3 turns', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.player.y = 300;
  state.player.facingX = 0;
  state.player.facingY = -1;
  state.enemies = [
    { id: 'near_guard', type: 'guard', x: 200, y: 250, hp: 20, maxHp: 20, speed: 0, damage: 0, stunned: 0, facing: -1 }
  ];

  assert.ok(logic.legalActions(state).includes('flashbang'));
  logic.step(state, 'flashbang');
  assert.equal(state.player.flashbangs, 1);
  const guard = state.enemies.find(e => e.id === 'near_guard');
  assert.ok(guard);
  // Stunned was set to 3, decremented by 1 at end of turn -> 2
  assert.equal(guard.stunned, 2);
});

test('breach_charge unlocks adjacent blast door, damages and stuns hostiles behind door', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.player.y = 280; // Adjacent to door1 at y: 260
  state.enemies = [
    { id: 'behind_guard', type: 'guard', x: 200, y: 240, hp: 60, maxHp: 60, speed: 0, damage: 0, stunned: 0, facing: 1 }
  ];

  assert.ok(logic.legalActions(state).includes('breach_charge'));
  logic.step(state, 'breach_charge');
  assert.equal(state.doors[0].breached, true);
  assert.equal(state.player.breachCharges, 1);
  const enemy = state.enemies.find(e => e.id === 'behind_guard');
  assert.ok(enemy);
  assert.equal(enemy.hp, 10); // Took 50 damage
  assert.equal(enemy.stunned, 2); // 3 turns - 1 turn elapsed
});

test('vault core is retrieved when operative steps near vault pad', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.player.y = 70;
  state.vaultCore.collected = false;

  logic.step(state, 'move_n');
  assert.equal(state.hasCore, true);
  assert.ok(state.scoreVal >= 1000);
});

test('operative extraction with core triggers victory', () => {
  const state = logic.createState(42);
  state.hasCore = true;
  state.player.x = 200;
  state.player.y = 60; // Extraction pad zone

  logic.step(state, 'move_n');
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.ok(state.scoreVal >= 2000);
});

test('sentry turret inflicts damage within line of sight', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.player.y = 100;
  state.player.ammo = 5;
  state.enemies = [
    { id: 'sentry', type: 'sentry', x: 200, y: 80, hp: 35, maxHp: 35, speed: 0, damage: 20, stunned: 0, cooldown: 0 }
  ];

  logic.step(state, 'reload');
  assert.equal(state.player.hp, 80); // Took 20 damage
});

test('player defeat terminates game with state.lost = true', () => {
  const state = logic.createState(42);
  state.player.hp = 5;
  state.player.ammo = 5;
  state.enemies = [
    { id: 'striker', type: 'guard', x: 200, y: 350, hp: 20, maxHp: 20, speed: 12, damage: 10, stunned: 0, facing: 1 }
  ];

  logic.step(state, 'reload');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
  assert.deepEqual(logic.legalActions(state), []);
});
