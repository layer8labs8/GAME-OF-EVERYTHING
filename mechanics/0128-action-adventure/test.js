const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes player on Wing 1 with sword, boomerang, and full HP', () => {
  const s = createState(42);
  assert.strictEqual(s.wing, 1);
  assert.strictEqual(s.player.x, 1);
  assert.strictEqual(s.player.y, 1);
  assert.strictEqual(s.player.hp, 30);
  assert.ok(s.player.tools.includes('sword'));
  assert.ok(s.player.tools.includes('boomerang'));
  assert.strictEqual(s.player.keys, 0);
  assert.strictEqual(isOver(s), false);
});

test('move shifts player to adjacent open floor tile', () => {
  const s = createState(42);
  step(s, 'move:right');
  assert.strictEqual(s.player.x, 2);
  assert.strictEqual(s.player.y, 1);
});

test('bump combat attacks adjacent enemy with sword', () => {
  const s = createState(42);
  s.enemies = [{ id: 'test_foe', name: 'Test Foe', type: 'stalker', x: 2, y: 1, hp: 15, maxHp: 15, atk: 5, stunned: 0 }];
  step(s, 'move:right');
  assert.strictEqual(s.enemies[0].hp, 5); // 15 - 10
  assert.ok(score(s) > 0);
});

test('throw_boomerang triggers crystal switch and opens barrier gate', () => {
  const s = createState(42);
  s.enemies = [];
  s.player.x = 2;
  s.player.y = 2;
  s.map[2][7] = '*';
  s.map[4][4] = 'G'; // Gate

  step(s, 'throw_boomerang:right');
  assert.strictEqual(s.map[4][4], '.'); // Gate lowered
  assert.ok(score(s) >= 50);
});

test('throw_boomerang stuns enemy in line of fire', () => {
  const s = createState(42);
  s.enemies = [{ id: 'foe', name: 'Desert Stalker', type: 'stalker', x: 4, y: 1, hp: 16, maxHp: 16, atk: 5, stunned: 0 }];
  step(s, 'throw_boomerang:right');
  assert.ok(s.enemies[0].stunned > 0);
});

test('stepping on Small Key collects key into pouch', () => {
  const s = createState(42);
  s.map[1][2] = 'k';
  step(s, 'move:right');
  assert.strictEqual(s.player.keys, 1);
  assert.strictEqual(s.map[1][2], '.');
});

test('unlocking door D transitions to Wing 2 and grants bombs', () => {
  const s = createState(42);
  s.player.x = 7;
  s.player.y = 8;
  s.player.keys = 1;
  s.map[8][8] = 'D';

  const legals = legalActions(s);
  assert.ok(legals.includes('unlock:right'));

  step(s, 'unlock:right');
  assert.strictEqual(s.wing, 2);
  assert.strictEqual(s.player.x, 1);
  assert.strictEqual(s.player.y, 1);
  assert.ok(s.player.tools.includes('bombs'));
});

test('place_bomb detonates cracked wall into rubble', () => {
  const s = createState(42);
  s.wing = 2;
  s.player.tools.push('bombs');
  s.player.bombsCount = 3;
  s.map[1][2] = 'C';

  const legals = legalActions(s);
  assert.ok(legals.includes('place_bomb:right'));

  step(s, 'place_bomb:right');
  assert.strictEqual(s.map[1][2], '.');
  assert.strictEqual(s.player.bombsCount, 2);
});

test('collecting Master Key sets hasMasterKey true', () => {
  const s = createState(42);
  s.map[1][2] = 'B';
  step(s, 'move:right');
  assert.strictEqual(s.player.hasMasterKey, true);
  assert.strictEqual(s.map[1][2], '.');
});

test('hookshot pulls player across chasm to post', () => {
  const s = createState(42);
  s.wing = 3;
  s.player.tools.push('hookshot');
  s.player.x = 1;
  s.player.y = 4;
  s.map[4][2] = '~';
  s.map[4][3] = '~';
  s.map[4][4] = 'P';

  const legals = legalActions(s);
  assert.ok(legals.includes('hookshot:right'));

  step(s, 'hookshot:right');
  assert.strictEqual(s.player.x, 3); // Position right before post
  assert.strictEqual(s.player.y, 4);
});

test('unlock with Master Key opens Boss Sanctum X', () => {
  const s = createState(42);
  s.player.hasMasterKey = true;
  s.map[1][2] = 'X';

  const legals = legalActions(s);
  assert.ok(legals.includes('unlock:right'));

  step(s, 'unlock:right');
  assert.strictEqual(s.map[1][2], '.');
});

test('claiming Solar Relic R wins game and yields 1.0 reward', () => {
  const s = createState(42);
  s.map[1][2] = 'R';
  const res = step(s, 'move:right');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(res.reward, 1.0);
});

test('depleting HP triggers defeat and 0.0 reward', () => {
  const s = createState(42);
  s.player.hp = 4;
  s.enemies = [{ id: 'boss', name: 'Deadly Boss', type: 'boss', x: 2, y: 1, hp: 50, maxHp: 50, atk: 10, stunned: 0 }];
  const res = step(s, 'wait');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(res.reward, 0.0);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(42);
  const cloned = JSON.parse(JSON.stringify(s));

  assert.throws(() => {
    step(s, 'move:up'); // (1, 0) is wall '#'
  });

  assert.deepStrictEqual(s.player, cloned.player);
});

test('same seed and actions produce strictly deterministic state', () => {
  const s1 = createState(10101);
  const s2 = createState(10101);

  const actions = ['move:right', 'move:right', 'wait', 'throw_boomerang:down'];
  for (const act of actions) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepStrictEqual(s1, s2);
});
