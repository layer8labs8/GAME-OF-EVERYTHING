const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes player, 3 HP, 4 ammo, and Room 1 hostiles', () => {
  const state = logic.createState(42);
  assert.equal(state.player.hp, 3);
  assert.equal(state.player.ammo, 4);
  assert.equal(state.player.x, 1);
  assert.equal(state.player.y, 8);
  assert.equal(state.room, 1);
  assert.equal(state.enemies.length, 3);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('move_n moves player up and legalActions updates', () => {
  const state = logic.createState(42);
  const res = logic.step(state, 'move_n');
  assert.equal(state.player.x, 1);
  assert.equal(state.player.y, 7);
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
});

test('shoot_e expends 1 ammo and spawns player bullet moving east', () => {
  const state = logic.createState(42);
  logic.step(state, 'shoot_e');
  assert.equal(state.player.ammo, 3);
  assert.equal(state.bullets.length, 1);
  assert.equal(state.bullets[0].owner, 'player');
  assert.equal(state.bullets[0].dx, 1);
});

test('player bullet strikes enemy, inflicts damage and awards points', () => {
  const state = logic.createState(42);
  // Clear enemies and place single agent directly east of player
  state.enemies = [{ id: 'target', type: 'agent', x: 4, y: 8, hp: 1, maxHp: 1, cooldown: 1 }];
  state.player.x = 1;
  state.player.y = 8;
  state.player.ammo = 1;

  logic.step(state, 'shoot_e');
  // Bullet starts at (2, 8), travels to (3, 8)
  logic.step(state, 'wait');
  // Bullet arrives at (4, 8) and destroys target, advancing to Room 2
  assert.equal(state.kills, 1);
  assert.equal(state.room, 2);
  assert.ok(state.scoreVal >= 300);
});

test('punch_n attacks adjacent enemy and restores ammo', () => {
  const state = logic.createState(42);
  state.player.x = 4;
  state.player.y = 5;
  state.player.ammo = 1;
  state.enemies = [{ id: 'target', type: 'brawler', x: 4, y: 4, hp: 2, maxHp: 2, cooldown: 1 }];

  assert.ok(logic.legalActions(state).includes('punch_n'));
  logic.step(state, 'punch_n');
  assert.equal(state.kills, 1);
  assert.equal(state.room, 2); // Room cleared and advanced
  assert.ok(state.player.ammo >= 2);
});

test('stepping on dropped ammo pickup collects it', () => {
  const state = logic.createState(42);
  state.player.x = 4;
  state.player.y = 5;
  state.player.ammo = 2;
  state.pickups = [{ x: 4, y: 4 }];

  logic.step(state, 'move_n');
  assert.equal(state.player.y, 4);
  assert.equal(state.player.ammo, 4);
  assert.equal(state.pickups.length, 0);
});

test('enemy bullet colliding with player deducts 1 HP', () => {
  const state = logic.createState(42);
  state.player.x = 5;
  state.player.y = 5;
  state.bullets = [{ id: 'eb1', x: 5, y: 4, dx: 0, dy: 1, owner: 'enemy' }];

  logic.step(state, 'wait');
  assert.equal(state.player.hp, 2);
});

test('clearing Room 1 advances to Room 2 with rewards', () => {
  const state = logic.createState(42);
  state.enemies = []; // Instant clear
  logic.step(state, 'wait');

  assert.equal(state.room, 2);
  assert.ok(state.enemies.length > 0);
});

test('clearing final Room 3 triggers victory', () => {
  const state = logic.createState(42);
  state.room = 3;
  state.enemies = [];
  logic.step(state, 'wait');

  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.equal(logic.legalActions(state).length, 0);
});

test('depleting player HP triggers defeat', () => {
  const state = logic.createState(42);
  state.player.hp = 1;
  state.player.x = 5;
  state.player.y = 5;
  state.bullets = [{ id: 'eb1', x: 5, y: 4, dx: 0, dy: 1, owner: 'enemy' }];

  logic.step(state, 'wait');
  assert.equal(state.player.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(42);
  state.player.ammo = 0;
  assert.throws(() => logic.step(state, 'shoot_n'), /Illegal action/);
  assert.equal(state.player.ammo, 0);
});

test('same seed and actions yield strictly deterministic state', () => {
  const actions = ['move_n', 'wait', 'shoot_e', 'wait', 'move_e', 'wait'];
  const s1 = logic.createState(999);
  const s2 = logic.createState(999);

  for (const act of actions) {
    if (logic.legalActions(s1).includes(act)) {
      logic.step(s1, act);
      logic.step(s2, act);
    }
  }
  assert.deepEqual(s1, s2);
});
