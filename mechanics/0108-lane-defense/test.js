const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  NUM_LANES,
  LANE_LENGTH,
  TOWER_TYPES,
  WAVE_SCHEDULE
} = require('./www/logic.js');

test('createState initializes 3 lanes, gold, fortress HP, and starting archer tower', () => {
  const s = createState(111);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.gold, 60);
  assert.strictEqual(s.fortressHp, 30);
  assert.strictEqual(s.heroLane, 1);
  assert.strictEqual(s.lanes.length, 3);
  assert.strictEqual(s.lanes[1][1].tower.type, 'archer');
});

test('legalActions provides construction, hero lane shifts, and wave advance', () => {
  const s = createState(222);
  const actions = legalActions(s);

  assert.ok(actions.includes('advance_wave'));
  assert.ok(actions.includes('hero:0'));
  assert.ok(actions.includes('hero:2'));
  assert.ok(actions.some(a => a.startsWith('build:archer:')));
  assert.ok(actions.some(a => a.startsWith('build:barricade:')));
});

test('building tower deducts gold and places installation', () => {
  const s = createState(333);
  const initGold = s.gold;

  step(s, 'build:cannon:0,2');

  assert.strictEqual(s.lanes[0][2].tower.type, 'cannon');
  assert.strictEqual(s.gold, initGold - TOWER_TYPES.cannon.cost);
});

test('hero shifts lane upon order', () => {
  const s = createState(444);
  assert.strictEqual(s.heroLane, 1);

  step(s, 'hero:0');
  assert.strictEqual(s.heroLane, 0);
});

test('advance_wave spawns wave creeps, fires towers, and advances turn', () => {
  const s = createState(555);
  assert.strictEqual(s.activeCreeps.length, 0);

  step(s, 'advance_wave');

  assert.strictEqual(s.turn, 2);
  assert.ok(s.activeCreeps.length > 0);
});

test('barricade halts creep advance and absorbs damage', () => {
  const s = createState(666);
  // Build barricade on Lane 0, Slot 3
  step(s, 'build:barricade:0,3');
  assert.strictEqual(s.lanes[0][3].tower.type, 'barricade');

  // Place enemy right in front of barricade at x: 4
  s.activeCreeps.push({
    id: 'test_goblin',
    type: 'goblin',
    lane: 0,
    x: 4,
    hp: 14,
    maxHp: 14,
    speed: 2,
    dmg: 5,
    bounty: 6
  });

  const initBarHp = s.lanes[0][3].tower.hp;
  step(s, 'advance_wave');

  // Barricade should have absorbed creep damage
  if (s.lanes[0][3].tower) {
    assert.ok(s.lanes[0][3].tower.hp < initBarHp);
  }
});

test('depleting fortress HP triggers defeat', () => {
  const s = createState(777);
  s.fortressHp = 2;
  s.activeCreeps.push({
    id: 'fatal_ogre',
    type: 'ogre',
    lane: 2,
    x: 1,
    hp: 50,
    maxHp: 50,
    speed: 1,
    dmg: 10,
    bounty: 20
  });

  step(s, 'advance_wave');

  assert.strictEqual(s.fortressHp, 0);
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'enemy');
});

test('clearing all waves past turn 28 triggers victory', () => {
  const s = createState(888);
  s.turn = 29;
  s.activeCreeps = [];

  step(s, 'advance_wave');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.ok(score(s) > 200);
});

test('illegal action throws error without state mutation', () => {
  const s = createState(999);
  const snap = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'build:laser_satellite:1,2');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), snap);
});

test('same seed and sequence of defensive actions yields deterministic simulation', () => {
  const s1 = createState(108000);
  const s2 = createState(108000);

  for (let i = 0; i < 6; i++) {
    if (s1.done) break;
    const legals = legalActions(s1);
    if (legals.length === 0) break;
    const act = legals[0];
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
