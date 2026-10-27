const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TICKS,
  BASE_MAX_HP
} = require('./www/logic.js');

test('createState initializes player and enemy bases, cores, and workers', () => {
  const s = createState(42);
  assert.equal(s.tick, 1);
  assert.equal(s.player.coreHp, BASE_MAX_HP);
  assert.equal(s.player.minerals, 100);
  assert.equal(s.player.workers, 2);
  assert.equal(s.player.armyPosition, 0);

  assert.equal(s.enemy.coreHp, BASE_MAX_HP);
  assert.equal(s.enemy.armyPosition, 2);
  assert.equal(s.done, false);
});

test('legalActions contains worker training, barracks construction, and tick', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('tick'));
  assert.ok(actions.includes('train_worker'));
  assert.ok(actions.includes('build_barracks'));
  assert.ok(!actions.includes('train_marine')); // requires barracks
});

test('training worker consumes minerals and increases mineral yield', () => {
  const s = createState(202);
  const initialMinerals = s.player.minerals;
  const initialWorkers = s.player.workers;

  const res = step(s, 'train_worker');
  assert.equal(s.player.workers, initialWorkers + 1);
  // Minerals: 100 - 50 + (3 workers * 3 = 9) = 59
  assert.equal(s.player.minerals, initialMinerals - 50 + (3 * 3));
  assert.ok(res.reward > 0);
});

test('constructing barracks unlocks marine infantry production', () => {
  const s = createState(303);
  step(s, 'build_barracks');
  assert.equal(s.player.barracks, 1);

  // Accumulate minerals for marine
  s.player.minerals = 50;
  const actions = legalActions(s);
  assert.ok(actions.includes('train_marine'));

  step(s, 'train_marine');
  assert.equal(s.player.marines, 1);
});

test('constructing factory unlocks siege tank production', () => {
  const s = createState(404);
  s.player.barracks = 1;
  s.player.minerals = 300;

  step(s, 'build_factory');
  assert.equal(s.player.factory, 1);

  s.player.minerals = 100;
  const actions = legalActions(s);
  assert.ok(actions.includes('train_tank'));

  step(s, 'train_tank');
  assert.equal(s.player.tanks, 1);
});

test('tactical maneuvers advance strike force towards enemy base', () => {
  const s = createState(505);
  s.player.marines = 2;

  step(s, 'order_advance');
  assert.equal(s.player.armyPosition, 1); // Midfield

  step(s, 'order_advance');
  assert.equal(s.player.armyPosition, 2); // Enemy base

  step(s, 'order_retreat');
  assert.equal(s.player.armyPosition, 1);
});

test('combat between armies inflicts casualties and scores rewards', () => {
  const s = createState(606);
  s.player.marines = 5;
  s.player.marineHpPool = 40;
  s.player.armyPosition = 1;

  s.enemy.marines = 2;
  s.enemy.marineHpPool = 40;
  s.enemy.armyPosition = 1;

  const prevEnemyMarines = s.enemy.marines;
  const res = step(s, 'tick');
  // High player DPS wipes or damages enemy
  assert.ok(s.enemy.marines <= prevEnemyMarines);
  assert.ok(res.reward >= 0);
});

test('destroying enemy command core triggers victory', () => {
  const s = createState(707);
  s.player.tanks = 10;
  s.player.tankHpPool = 90;
  s.player.armyPosition = 2; // At enemy base

  s.enemy.marines = 0;
  s.enemy.tanks = 0;
  s.enemy.coreHp = 20; // Low HP

  step(s, 'tick');
  assert.equal(s.enemy.coreHp, 0);
  assert.equal(s.done, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.result, 'victory');
  assert.equal(isOver(s), true);
  assert.ok(score(s) > 500);
});

test('player command core destruction triggers defeat', () => {
  const s = createState(808);
  s.enemy.tanks = 10;
  s.enemy.tankHpPool = 90;
  s.enemy.armyPosition = 0; // At player base

  s.player.marines = 0;
  s.player.tanks = 0;
  s.player.coreHp = 20;

  step(s, 'tick');
  assert.equal(s.player.coreHp, 0);
  assert.equal(s.done, true);
  assert.equal(s.winner, 'enemy');
  assert.equal(s.result, 'defeat');
});

test('illegal action throws error without state mutation', () => {
  const s = createState(909);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'train_tank'); // No factory
  }, /Illegal action/);

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and commands yield strictly deterministic RTS simulation', () => {
  const s1 = createState(1313);
  const s2 = createState(1313);

  const orders = ['train_worker', 'build_barracks', 'tick', 'tick'];
  for (const act of orders) {
    if (legalActions(s1).includes(act) && legalActions(s2).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
});
