const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes mortal player on Depth 1 with full supplies', () => {
  const s = createState(777);
  assert.strictEqual(s.depth, 1);
  assert.strictEqual(s.player.x, 1);
  assert.strictEqual(s.player.y, 1);
  assert.strictEqual(s.player.hp, 50);
  assert.strictEqual(s.player.elixirs, 2);
  assert.strictEqual(s.player.toolkits, 3);
  assert.strictEqual(s.player.gold, 0);
  assert.strictEqual(isOver(s), false);
});

test('move shifts player coordinates cleanly', () => {
  const s = createState(777);
  step(s, 'move:right');
  assert.strictEqual(s.player.x, 2);
  assert.strictEqual(s.player.y, 1);
});

test('stepping on active trap T triggers hazard damage', () => {
  const s = createState(777);
  // Place trap at (2, 1)
  s.map[1][2] = 'T';
  const initialHp = s.player.hp;
  step(s, 'move:right');
  assert.ok(s.player.hp <= initialHp - 15);
});

test('disarm neutralizes adjacent trap into safe t and consumes toolkit', () => {
  const s = createState(777);
  s.map[1][2] = 'T';

  const legals = legalActions(s);
  assert.ok(legals.includes('disarm:right'));

  step(s, 'disarm:right');
  assert.strictEqual(s.map[1][2], 't');
  assert.strictEqual(s.player.toolkits, 2); // 3 - 1
  assert.ok(score(s) >= 50);
});

test('stepping on gold chest collects 100 gold', () => {
  const s = createState(777);
  s.map[1][2] = 'G';
  step(s, 'move:right');
  assert.strictEqual(s.player.gold, 100);
  assert.strictEqual(s.map[1][2], '.');
});

test('bump combat damages adjacent enemy', () => {
  const s = createState(777);
  s.enemies = [{ id: 'test_skel', name: 'Test Skeleton', type: 'skeleton', x: 2, y: 1, hp: 20, maxHp: 20, atk: 5, def: 2 }];
  step(s, 'move:right');
  assert.ok(s.enemies[0].hp < 20);
});

test('quaff consumes elixir to heal 25 HP', () => {
  const s = createState(777);
  s.player.hp = 20;

  const legals = legalActions(s);
  assert.ok(legals.includes('quaff'));

  step(s, 'quaff');
  assert.strictEqual(s.player.hp, 45); // 20 + 25
  assert.strictEqual(s.player.elixirs, 1);
});

test('descend at stairs advances to next depth with fresh map', () => {
  const s = createState(777);
  // Stairs in Depth 1 are at (8, 8)
  s.player.x = 8;
  s.player.y = 8;

  const legals = legalActions(s);
  assert.ok(legals.includes('descend'));

  step(s, 'descend');
  assert.strictEqual(s.depth, 2);
  assert.strictEqual(s.player.x, 1);
  assert.strictEqual(s.player.y, 1);
  assert.ok(s.enemies.some(e => e.type === 'hound'));
});

test('retire at stairs executes safe extraction and achieves victory', () => {
  const s = createState(777);
  s.player.x = 8;
  s.player.y = 8;
  s.player.gold = 200;

  const legals = legalActions(s);
  assert.ok(legals.includes('retire'));

  const res = step(s, 'retire');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(s.retired, true);
  assert.strictEqual(res.reward, 1.0);
  assert.ok(score(s) > 1500);
});

test('claiming Eternal Sigil S at Depth 4 wins game', () => {
  const s = createState(777);
  s.depth = 4;
  s.map[1][2] = 'S';
  const res = step(s, 'move:right');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(res.reward, 1.0);
});

test('depleting HP triggers permadeath and 0.0 reward', () => {
  const s = createState(777);
  s.player.hp = 5;
  // Step on lethal trap
  s.map[1][2] = 'T';
  const res = step(s, 'move:right');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(res.reward, 0.0);
  assert.ok(s.causeOfDeath);
});

test('illegal action throws without mutating state', () => {
  const s = createState(777);
  const cloned = JSON.parse(JSON.stringify(s));

  assert.throws(() => {
    step(s, 'move:into_the_void');
  });

  assert.deepStrictEqual(s.player, cloned.player);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999123);
  const s2 = createState(999123);

  const actions = ['move:right', 'move:right', 'move:down', 'wait', 'wait'];
  for (const act of actions) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepStrictEqual(s1, s2);
});
