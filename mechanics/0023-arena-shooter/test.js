const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes player at center, 100 HP, and wave 1 drones', () => {
  const state = logic.createState(42);
  assert.equal(state.player.x, 200);
  assert.equal(state.player.y, 200);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.weapon, 'blaster');
  assert.equal(state.wave, 1);
  assert.equal(state.enemies.length, 4);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('move_n shifts player upward within arena boundaries', () => {
  const state = logic.createState(42);
  const initialY = state.player.y;
  const res = logic.step(state, 'move_n');
  assert.equal(state.player.y, initialY - 26);
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
});

test('fire_n spawns blaster projectile traveling upward', () => {
  const state = logic.createState(42);
  logic.step(state, 'fire_n');
  assert.equal(state.projectiles.length, 1);
  assert.equal(state.projectiles[0].owner, 'player');
  assert.equal(state.projectiles[0].vy, -45);
});

test('select_shotgun and fire_e spawns 3 spread pellets and consumes shell', () => {
  const state = logic.createState(42);
  logic.step(state, 'select_shotgun');
  assert.equal(state.player.weapon, 'shotgun');

  logic.step(state, 'fire_e');
  assert.equal(state.player.shells, 11);
  assert.equal(state.projectiles.length, 3);
});

test('select_plasma and fire_s spawns piercing projectile and consumes cell', () => {
  const state = logic.createState(42);
  logic.step(state, 'select_plasma');
  assert.equal(state.player.weapon, 'plasma');

  logic.step(state, 'fire_s');
  assert.equal(state.player.plasma, 5);
  assert.equal(state.projectiles.length, 1);
  assert.equal(state.projectiles[0].pierce, true);
});

test('player projectile inflicts damage on enemies and awards points', () => {
  const state = logic.createState(42);
  // Place dummy enemy directly north of player within bullet trajectory
  state.enemies = [{ id: 'target', type: 'drone', x: 200, y: 155, hp: 30, maxHp: 30, speed: 0, damage: 0, cooldown: 1 }];
  const initialScore = state.scoreVal;

  logic.step(state, 'fire_n');
  assert.ok(state.enemies[0].hp < 30);
  assert.ok(state.scoreVal > initialScore);
});

test('collecting pickup restores resources', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.player.y = 200;
  state.player.hp = 60;
  state.pickups = [{ type: 'medkit', x: 205, y: 205 }];

  logic.step(state, 'wait');
  assert.equal(state.player.hp, 90);
  assert.equal(state.pickups.length, 0);
});

test('dodge rolls player and triggers cooldown', () => {
  const state = logic.createState(42);
  logic.step(state, 'dodge');
  assert.ok(state.player.dodgeCooldown > 0);
  assert.ok(!logic.legalActions(state).includes('dodge'));
});

test('slaying wave enemies advances to wave 2 with resource refill', () => {
  const state = logic.createState(42);
  state.enemies = []; // All enemies slain
  logic.step(state, 'wait');

  assert.equal(state.wave, 2);
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
  state.player.hp = 5;
  state.player.x = 200;
  state.player.y = 200;
  // Place juggernaut right on top of player
  state.enemies = [{ id: 'boss', type: 'juggernaut', x: 200, y: 200, hp: 100, maxHp: 100, speed: 0, damage: 30, cooldown: 1 }];

  logic.step(state, 'wait');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(42);
  state.player.plasma = 0;
  assert.throws(() => logic.step(state, 'select_plasma'), /Illegal action/);
  assert.equal(state.player.plasma, 0);
});

test('same seed and actions yield strictly deterministic state', () => {
  const actions = ['move_n', 'fire_n', 'move_e', 'fire_e', 'wait', 'dodge'];
  const s1 = logic.createState(888);
  const s2 = logic.createState(888);

  for (const act of actions) {
    if (logic.legalActions(s1).includes(act)) {
      logic.step(s1, act);
      logic.step(s2, act);
    }
  }
  assert.deepEqual(s1, s2);
});
