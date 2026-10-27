const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes player on Sector 1 with valid topology and entities', () => {
  const s = createState(12345);
  assert.strictEqual(s.sector, 1);
  assert.strictEqual(s.player.x, 1);
  assert.strictEqual(s.player.y, 1);
  assert.strictEqual(s.player.hp, 60);
  assert.strictEqual(s.player.flux, 40);
  assert.strictEqual(s.player.keystones, 0);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(s.visible[1][1], true);
  assert.strictEqual(s.explored[1][1], true);
});

test('move shifts player and updates FOV', () => {
  const s = createState(12345);
  step(s, 'move:right');
  assert.strictEqual(s.player.x, 2);
  assert.strictEqual(s.player.y, 1);
  assert.strictEqual(s.visible[1][2], true);
});

test('collecting Keystone increments keystone count and scores points', () => {
  const s = createState(12345);
  s.player.x = 7;
  s.player.y = 1;
  // In Sector 1, Keystone is at (7, 2)
  step(s, 'move:down');
  assert.strictEqual(s.player.keystones, 1);
  assert.strictEqual(s.map[2][7], '.');
  assert.ok(score(s) >= 400);
});

test('absorbing Flux node restores player flux', () => {
  const s = createState(12345);
  s.player.flux = 20;
  // Move to (2, 6) where Flux node is located
  s.player.x = 2;
  s.player.y = 5;
  step(s, 'move:down');
  assert.strictEqual(s.player.flux, 50); // 20 + 30
});

test('bump combat damages anomaly enemy', () => {
  const s = createState(12345);
  // Spawn dummy enemy next to player
  s.enemies = [{ id: 'test_enemy', name: 'Test Glitch', type: 'sprite', x: 2, y: 1, hp: 20, maxHp: 20, atk: 5 }];
  step(s, 'move:right');
  assert.strictEqual(s.enemies[0].hp, 8); // 20 - 12
  assert.ok(score(s) > 0);
});

test('erode action dissolves adjacent wall into walkable floor', () => {
  const s = createState(12345);
  s.player.x = 1;
  s.player.y = 4;
  s.player.flux = 30;
  // (1, 5) is '#' in BSP
  s.map[5][1] = '#';

  const legals = legalActions(s);
  assert.ok(legals.includes('erode:down'));

  step(s, 'erode:down');
  assert.strictEqual(s.map[5][1], '.');
  assert.strictEqual(s.player.flux, 20); // 30 - 10
});

test('solidify action creates wall barrier on adjacent floor', () => {
  const s = createState(12345);
  s.player.flux = 30;
  assert.strictEqual(s.map[1][2], '.');

  const legals = legalActions(s);
  assert.ok(legals.includes('solidify:right'));

  step(s, 'solidify:right');
  assert.strictEqual(s.map[1][2], '#');
  assert.strictEqual(s.player.flux, 20);
});

test('pulse action reveals expanded 5x5 topology', () => {
  const s = createState(12345);
  s.player.flux = 20;

  step(s, 'pulse');
  assert.strictEqual(s.explored[4][4], true);
  assert.strictEqual(s.player.flux, 15);
});

test('wait action recuperates flux', () => {
  const s = createState(12345);
  s.player.flux = 20;

  step(s, 'wait');
  assert.strictEqual(s.player.flux, 25);
});

test('activate portal in Sector 1 transitions to Sector 2 (Cellular Caves)', () => {
  const s = createState(12345);
  // Exit portal in Sector 1 is at (8, 8)
  s.player.x = 8;
  s.player.y = 8;

  const legals = legalActions(s);
  assert.ok(legals.includes('activate'));

  step(s, 'activate');
  assert.strictEqual(s.sector, 2);
  assert.strictEqual(s.player.x, 1);
  assert.strictEqual(s.player.y, 1);
  assert.ok(s.enemies.some(e => e.type === 'stalker'));
});

test('activate portal in Sector 4 triggers victory and 1.0 reward', () => {
  const s = createState(12345);
  s.sector = 4;
  s.map[4][4] = 'E';
  s.player.x = 4;
  s.player.y = 4;
  s.player.keystones = 3;

  const res = step(s, 'activate');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(res.reward, 1.0);
});

test('depleting HP triggers defeat and 0.0 reward', () => {
  const s = createState(12345);
  s.player.hp = 5;
  // Place enemy that deals 10 damage adjacent to player
  s.enemies = [{ id: 'boss', name: 'Deadly Boss', type: 'boss', x: 2, y: 1, hp: 50, maxHp: 50, atk: 15 }];
  const res = step(s, 'wait');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(res.reward, 0.0);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(12345);
  const cloned = JSON.parse(JSON.stringify(s));

  assert.throws(() => {
    step(s, 'move:invalid_direction');
  });

  assert.deepStrictEqual(s.player, cloned.player);
});

test('same seed and actions produce strictly deterministic state', () => {
  const s1 = createState(888123);
  const s2 = createState(888123);

  const actions = ['move:right', 'move:right', 'move:down', 'wait', 'pulse'];
  for (const act of actions) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepStrictEqual(s1, s2);
});
