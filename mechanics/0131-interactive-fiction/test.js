const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  getCurrentLocation
} = require('./www/logic.js');

test('createState initializes in clearing with empty inventory and 0 treasures', () => {
  const s = createState(42);
  assert.strictEqual(s.currentLocation, 'clearing');
  assert.strictEqual(s.inventory.length, 0);
  assert.strictEqual(s.treasuresDeposited, 0);
  assert.strictEqual(s.lanternLit, false);
  assert.strictEqual(isOver(s), false);
  const loc = getCurrentLocation(s);
  assert.strictEqual(loc.name, 'Cottage Clearing');
});

test('open mailbox reveals leaflet on ground', () => {
  const s = createState(42);
  step(s, 'open:mailbox');
  assert.ok(s.itemsAt.clearing.includes('leaflet'));

  const legals = legalActions(s);
  assert.ok(legals.includes('take:leaflet'));

  step(s, 'take:leaflet');
  assert.ok(s.inventory.includes('leaflet'));
});

test('move mat reveals brass key and unlocking door allows entry', () => {
  const s = createState(42);
  step(s, 'move:mat');
  step(s, 'take:brass_key');
  assert.ok(s.inventory.includes('brass_key'));

  step(s, 'unlock:door');
  assert.strictEqual(s.world.front_door_locked, false);

  const legals = legalActions(s);
  assert.ok(legals.includes('go:east'));

  step(s, 'go:east');
  assert.strictEqual(s.currentLocation, 'cottage');
});

test('taking and lighting brass lantern provides light', () => {
  const s = createState(42);
  s.currentLocation = 'cottage';
  step(s, 'take:brass_lantern');
  assert.ok(s.inventory.includes('brass_lantern'));

  const legals = legalActions(s);
  assert.ok(legals.includes('light:lantern'));

  step(s, 'light:lantern');
  assert.strictEqual(s.lanternLit, true);
});

test('moving rug and opening trapdoor allows descent to cavern', () => {
  const s = createState(42);
  s.currentLocation = 'cottage';
  step(s, 'move:rug');
  step(s, 'open:trapdoor');
  assert.strictEqual(s.world.trapdoor_open, true);

  const legals = legalActions(s);
  assert.ok(legals.includes('go:down'));

  step(s, 'go:down');
  assert.strictEqual(s.currentLocation, 'cavern');
});

test('climbing tree to canopy allows taking Jeweled Egg', () => {
  const s = createState(42);
  s.currentLocation = 'forest';
  step(s, 'go:up');
  assert.strictEqual(s.currentLocation, 'tree_canopy');

  const legals = legalActions(s);
  assert.ok(legals.includes('take:jeweled_egg'));

  step(s, 'take:jeweled_egg');
  assert.ok(s.inventory.includes('jeweled_egg'));
});

test('depositing all 3 treasures into Trophy Case triggers victory and 1.0 reward', () => {
  const s = createState(42);
  s.currentLocation = 'cottage';
  s.inventory = ['jeweled_egg', 'platinum_ingot', 'golden_chalice'];

  step(s, 'deposit:jeweled_egg');
  assert.strictEqual(s.treasuresDeposited, 1);

  step(s, 'deposit:platinum_ingot');
  assert.strictEqual(s.treasuresDeposited, 2);

  const res = step(s, 'deposit:golden_chalice');
  assert.strictEqual(s.treasuresDeposited, 3);
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(res.reward, 1.0);
  assert.ok(score(s) > 3000);
});

test('lingering in dark cavern without lit lantern results in grue defeat', () => {
  const s = createState(42);
  s.currentLocation = 'cottage';
  s.world.trapdoor_open = true;
  s.lanternLit = false;

  step(s, 'go:down'); // warning given
  assert.strictEqual(s.world.grueWarning, true);
  assert.strictEqual(s.done, false);

  const res = step(s, 'wait'); // eaten by grue!
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(res.reward, 0.0);
});

test('exceeding turn limit triggers defeat and 0.0 reward', () => {
  const s = createState(42);
  s.turns = 149;
  const res = step(s, 'wait');
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(res.reward, 0.0);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(42);
  const cloned = JSON.parse(JSON.stringify(s));

  assert.throws(() => {
    step(s, 'go:down'); // not legal from clearing
  });

  assert.deepStrictEqual(s.inventory, cloned.inventory);
  assert.strictEqual(s.currentLocation, cloned.currentLocation);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(505);
  const s2 = createState(505);

  const script = ['open:mailbox', 'take:leaflet', 'move:mat', 'take:brass_key', 'unlock:door'];
  for (const act of script) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepStrictEqual(s1, s2);
});
