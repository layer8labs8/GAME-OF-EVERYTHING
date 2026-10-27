const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes adventure in the Foyer with empty inventory', () => {
  const s = createState(101);
  assert.strictEqual(s.currentRoom, 'foyer');
  assert.strictEqual(s.inventory.length, 0);
  assert.strictEqual(s.turns, 0);
  assert.strictEqual(isOver(s), false);
});

test('look at coat rack enables pickup brass key', () => {
  const s = createState(101);
  step(s, 'look:coat_rack');
  const legals = legalActions(s);
  assert.ok(legals.includes('pickup:brass_key'));

  step(s, 'pickup:brass_key');
  assert.ok(s.inventory.includes('brass_key'));
});

test('use brass key unlocks study door and allows travel', () => {
  const s = createState(101);
  s.inventory.push('brass_key');

  const legals = legalActions(s);
  assert.ok(legals.includes('use_item:brass_key:study_door'));

  step(s, 'use_item:brass_key:study_door');
  assert.strictEqual(s.world.study_unlocked, true);

  const postLegals = legalActions(s);
  assert.ok(postLegals.includes('go:study'));

  step(s, 'go:study');
  assert.strictEqual(s.currentRoom, 'study');
});

test('talking to butler reveals laboratory secret', () => {
  const s = createState(101);
  s.currentRoom = 'study';
  step(s, 'talk:butler');
  assert.strictEqual(s.world.butler_questioned, true);

  const legals = legalActions(s);
  assert.ok(legals.includes('go:laboratory'));
});

test('laboratory acid dissolving safe reveals golden astrolabe', () => {
  const s = createState(101);
  s.currentRoom = 'laboratory';
  s.inventory.push('empty_flask');

  // Fill flask with acid
  step(s, 'use_item:empty_flask:acid_vat');
  assert.ok(s.inventory.includes('acid_flask'));
  assert.strictEqual(s.inventory.includes('empty_flask'), false);

  // Melt safe
  step(s, 'use_item:acid_flask:iron_safe');
  assert.strictEqual(s.world.safe_opened, true);

  // Pickup astrolabe
  const legals = legalActions(s);
  assert.ok(legals.includes('pickup:golden_astrolabe'));

  step(s, 'pickup:golden_astrolabe');
  assert.ok(s.inventory.includes('golden_astrolabe'));
});

test('winding grandfather clock reveals observatory passage', () => {
  const s = createState(101);
  s.currentRoom = 'foyer';
  s.inventory.push('clock_crank');

  step(s, 'use_item:clock_crank:grandfather_clock');
  assert.strictEqual(s.world.clock_wound, true);

  const legals = legalActions(s);
  assert.ok(legals.includes('go:observatory'));

  step(s, 'go:observatory');
  assert.strictEqual(s.currentRoom, 'observatory');
});

test('placing golden astrolabe into celestial oculus wins the game', () => {
  const s = createState(101);
  s.currentRoom = 'observatory';
  s.inventory.push('golden_astrolabe');

  const legals = legalActions(s);
  assert.ok(legals.includes('use_item:golden_astrolabe:celestial_oculus'));

  const res = step(s, 'use_item:golden_astrolabe:celestial_oculus');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(res.reward, 1.0);
  assert.ok(score(s) > 3000);
});

test('exceeding maximum turns triggers defeat', () => {
  const s = createState(101);
  s.turns = 149;
  const res = step(s, 'look:coat_rack');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(res.reward, 0.0);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(101);
  const cloned = JSON.parse(JSON.stringify(s));

  assert.throws(() => {
    step(s, 'go:observatory'); // locked
  });

  assert.deepStrictEqual(s.inventory, cloned.inventory);
  assert.strictEqual(s.currentRoom, cloned.currentRoom);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['look:coat_rack', 'pickup:brass_key', 'use_item:brass_key:study_door', 'go:study', 'talk:butler'];
  for (const act of actions) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepStrictEqual(s1, s2);
});
