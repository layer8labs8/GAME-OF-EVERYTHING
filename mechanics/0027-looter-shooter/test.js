const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes operative with Common Pistol, 100 HP, 50 shield, room 1', () => {
  const state = logic.createState(27);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.shields, 50);
  assert.equal(state.player.weapon.rarity, 'common');
  assert.equal(state.player.weapon.damage, 12);
  assert.equal(state.room, 1);
  assert.ok(state.enemies.length >= 2);
  assert.ok(state.lootDrop !== null);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('movement updates position and facing vector', () => {
  const state = logic.createState(27);
  const initialY = state.player.y;
  const res = logic.step(state, 'move_s');
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
  assert.equal(state.player.y, initialY + 24);
  assert.equal(state.player.facingX, 0);
  assert.equal(state.player.facingY, 1);
});

test('fire consumes ammo, inflicts weapon damage on aligned hostile', () => {
  const state = logic.createState(27);
  state.player.x = 100;
  state.player.y = 160;
  state.player.facingX = 1;
  state.player.facingY = 0;
  state.enemies = [
    { id: 'target', type: 'scavenger', x: 200, y: 160, hp: 20, maxHp: 20, speed: 0, damage: 0, facingX: -1, facingY: 0 }
  ];

  logic.step(state, 'fire');
  assert.equal(state.player.ammo, 9);
  const enemy = state.enemies.find(e => e.id === 'target');
  assert.ok(enemy);
  assert.equal(enemy.hp, 20 - 12);
});

test('reload refills ammo to clip capacity', () => {
  const state = logic.createState(27);
  state.player.ammo = 3;
  logic.step(state, 'reload');
  assert.equal(state.player.ammo, state.player.weapon.clip);
});

test('equip_loot equips adjacent weapon drop and updates stats', () => {
  const state = logic.createState(27);
  state.player.x = 200;
  state.player.y = 140; // At loot drop location
  assert.ok(logic.legalActions(state).includes('equip_loot'));

  logic.step(state, 'equip_loot');
  assert.equal(state.player.weapon.rarity, 'rare');
  assert.equal(state.player.weapon.damage, 22);
  assert.equal(state.lootDrop.collected, true);
});

test('use_medkit consumes medkit and restores 40 HP', () => {
  const state = logic.createState(27);
  state.player.hp = 50;
  state.player.medkits = 1;

  assert.ok(logic.legalActions(state).includes('use_medkit'));
  logic.step(state, 'use_medkit');
  assert.equal(state.player.hp, 90);
  assert.equal(state.player.medkits, 0);
});

test('clearing room hostiles and moving east advances to next room', () => {
  const state = logic.createState(27);
  state.room = 1;
  state.enemies = []; // Clear room
  state.player.x = 340;
  state.player.y = 200;

  logic.step(state, 'move_e');
  assert.equal(state.room, 2);
  assert.equal(state.player.x, 60);
  assert.equal(state.player.shields, 50);
  assert.ok(state.enemies.length > 0);
});

test('shields absorb incoming damage before deducting health', () => {
  const state = logic.createState(27);
  state.player.hp = 100;
  state.player.shields = 30;
  state.player.ammo = 5;
  state.player.x = 200;
  state.player.y = 200;
  state.enemies = [
    { id: 'striker', type: 'scavenger', x: 210, y: 200, hp: 50, maxHp: 50, speed: 0, damage: 20, facingX: -1, facingY: 0 }
  ];

  logic.step(state, 'reload');
  // 20 damage absorbed by shields: 30 - 20 = 10
  assert.equal(state.player.shields, 10);
  assert.equal(state.player.hp, 100);
});

test('destroying Vault Warlord in Room 4 and extracting achieves victory', () => {
  const state = logic.createState(27);
  state.room = 4;
  state.player.x = 200;
  state.player.y = 200;
  state.enemies = []; // Warlord already destroyed

  assert.ok(logic.legalActions(state).includes('extract'));
  logic.step(state, 'extract');
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.ok(state.scoreVal >= 3000);
});

test('depleting player HP triggers defeat', () => {
  const state = logic.createState(27);
  state.player.hp = 10;
  state.player.shields = 0;
  state.player.ammo = 5;
  state.player.x = 200;
  state.player.y = 200;
  state.enemies = [
    { id: 'lethal', type: 'scavenger', x: 210, y: 200, hp: 50, maxHp: 50, speed: 0, damage: 25, facingX: -1, facingY: 0 }
  ];

  logic.step(state, 'reload');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
  assert.deepEqual(logic.legalActions(state), []);
});
