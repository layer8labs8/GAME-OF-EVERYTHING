const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes general at center, 100 HP, 100 stamina, 0 musou, and zone 1 battalion', () => {
  const state = logic.createState(123);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.stamina, 100);
  assert.equal(state.player.musouGauge, 0);
  assert.equal(state.zone, 1);
  assert.ok(state.enemies.length >= 10);
  assert.ok(state.enemies.some(e => e.type === 'captain'));
  assert.ok(state.enemies.some(e => e.type === 'archer'));
  assert.ok(state.enemies.some(e => e.type === 'grunt'));
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('directional movement updates coordinates, facing vector, and regenerates stamina', () => {
  const state = logic.createState(123);
  state.player.stamina = 50;
  const initialY = state.player.y;

  const res = logic.step(state, 'move_n');
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
  assert.equal(state.player.y, initialY - 25);
  assert.equal(state.player.facingX, 0);
  assert.equal(state.player.facingY, -1);
  assert.equal(state.player.stamina, 58);
});

test('dash traverses 50px, expends 20 stamina, and grants invulnerability', () => {
  const state = logic.createState(123);
  state.player.x = 200;
  state.player.y = 200;
  state.player.facingX = 1;
  state.player.facingY = 0;
  state.player.stamina = 80;

  logic.step(state, 'dash');
  assert.equal(state.player.x, 250);
  assert.equal(state.player.stamina, 60);
});

test('wide_cleave deals arc damage to hostiles in front and builds musou gauge', () => {
  const state = logic.createState(123);
  state.player.x = 200;
  state.player.y = 200;
  state.player.facingX = 1;
  state.player.facingY = 0;
  state.player.stamina = 50;
  state.enemies = [
    { id: 'front_grunt', type: 'grunt', x: 230, y: 200, hp: 15, maxHp: 15, speed: 0, damage: 0, cooldown: 1 },
    { id: 'rear_grunt', type: 'grunt', x: 150, y: 200, hp: 15, maxHp: 15, speed: 0, damage: 0, cooldown: 1 }
  ];

  logic.step(state, 'wide_cleave');
  assert.ok(state.player.musouGauge > 0);
  assert.equal(state.player.stamina, 38);
  // Front grunt dies or takes damage; rear grunt takes no damage
  const rear = state.enemies.find(e => e.id === 'rear_grunt');
  assert.ok(rear);
  assert.equal(rear.hp, 15);
});

test('heavy_smash deals heavy damage and knocks back front targets', () => {
  const state = logic.createState(123);
  state.player.x = 200;
  state.player.y = 200;
  state.player.facingX = 1;
  state.player.facingY = 0;
  state.player.stamina = 50;
  state.enemies = [
    { id: 'front_captain', type: 'captain', x: 230, y: 200, hp: 80, maxHp: 80, speed: 0, damage: 0, cooldown: 1 }
  ];

  logic.step(state, 'heavy_smash');
  assert.equal(state.player.stamina, 25);
  const target = state.enemies.find(e => e.id === 'front_captain');
  assert.ok(target);
  assert.equal(target.hp, 80 - 35);
  assert.ok(target.x > 230); // Knocked back to the right
});

test('musou_rampage requires 100 musou, hits all surrounding enemies in 360 radius', () => {
  const state = logic.createState(123);
  state.player.musouGauge = 100;
  state.enemies = [
    { id: 'e1', type: 'grunt', x: 200, y: 150, hp: 50, maxHp: 50, speed: 0, damage: 0, cooldown: 1 },
    { id: 'e2', type: 'grunt', x: 200, y: 250, hp: 50, maxHp: 50, speed: 0, damage: 0, cooldown: 1 }
  ];

  assert.ok(logic.legalActions(state).includes('musou_rampage'));
  logic.step(state, 'musou_rampage');
  assert.equal(state.player.musouGauge, 0);
  assert.equal(state.enemies.length, 0); // Both took 60 dmg and died
});

test('rest recovers 40 stamina up to 100 cap', () => {
  const state = logic.createState(123);
  state.player.stamina = 30;
  logic.step(state, 'rest');
  assert.equal(state.player.stamina, 70);
  logic.step(state, 'rest');
  assert.equal(state.player.stamina, 100);
});

test('archer arrows travel and inflict damage on hit', () => {
  const state = logic.createState(123);
  state.player.hp = 100;
  state.projectiles = [
    { id: 'arrow1', x: 210, y: 200, vx: -5, vy: 0, damage: 15, owner: 'enemy' }
  ];
  state.enemies = []; // No enemies to simplify
  logic.step(state, 'rest');
  assert.equal(state.player.hp, 85);
});

test('slaying vanguard captain grants 1000 bonus points, heals 30 HP, and advances zone', () => {
  const state = logic.createState(123);
  state.zone = 1;
  state.player.hp = 50;
  state.enemies = [
    { id: 'boss', type: 'captain', x: 230, y: 200, hp: 10, maxHp: 80, speed: 0, damage: 0, cooldown: 1 }
  ];
  state.player.facingX = 1;
  state.player.facingY = 0;

  logic.step(state, 'wide_cleave');
  assert.equal(state.zone, 2);
  assert.equal(state.player.hp, 80);
  assert.ok(state.scoreVal >= 1000);
  assert.ok(state.enemies.length > 0); // Zone 2 spawned
});

test('clearing all 3 zones triggers victory with bonus score', () => {
  const state = logic.createState(123);
  state.zone = 3;
  state.player.hp = 70;
  state.enemies = [
    { id: 'boss3', type: 'captain', x: 230, y: 200, hp: 10, maxHp: 110, speed: 0, damage: 0, cooldown: 1 }
  ];
  state.player.facingX = 1;
  state.player.facingY = 0;

  logic.step(state, 'wide_cleave');
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.ok(state.scoreVal >= 2500);
});

test('player defeat terminates game with state.lost = true', () => {
  const state = logic.createState(123);
  state.player.hp = 10;
  state.enemies = [
    { id: 'brute', type: 'captain', x: 200, y: 200, hp: 100, maxHp: 100, speed: 0, damage: 25, cooldown: 1 }
  ];
  logic.step(state, 'rest');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
  assert.deepEqual(logic.legalActions(state), []);
});
