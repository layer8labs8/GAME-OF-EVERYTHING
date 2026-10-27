const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  BUILDING_COSTS,
  BUILDING_POWER
} = require('./www/logic.js');

test('createState generates sector grid, deposits, command core, and baseline power', () => {
  const s = createState(42);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.minerals, 60);
  assert.strictEqual(s.powerGen, 20);
  assert.strictEqual(s.powerDraw, 0);
  assert.strictEqual(s.brownout, false);

  const cmd = s.grid[2][2].building;
  assert.ok(cmd);
  assert.strictEqual(cmd.type, 'command');
  assert.strictEqual(cmd.hp, 100);
});

test('legalActions returns builds adjacent to existing connected command base', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('wait'));
  // Adjacent tiles to (2, 2) are (1, 2), (3, 2), (2, 1), (2, 3)
  assert.ok(actions.includes('build:solar:1,2') || actions.includes('build:solar:2,1'));
  assert.ok(actions.includes('build:drill:1,2') || actions.includes('build:drill:2,1'));
});

test('building solar array increases power generation and maintains positive surplus', () => {
  const s = createState(202);
  const initGen = s.powerGen;

  step(s, 'build:solar:1,2');

  const solar = s.grid[1][2].building;
  assert.ok(solar);
  assert.strictEqual(solar.type, 'solar');
  assert.ok(s.powerGen > initGen);
  assert.strictEqual(s.brownout, false);
});

test('building mineral drill extracts minerals on adjacent cycles', () => {
  const s = createState(303);
  s.minerals = 100;

  step(s, 'build:drill:2,1');

  const drill = s.grid[2][1].building;
  assert.ok(drill);
  assert.strictEqual(drill.type, 'drill');

  const mineralsBefore = s.minerals;
  step(s, 'wait');
  assert.ok(s.minerals > mineralsBefore);
});

test('excessive power demand triggers brownout and colonist casualties', () => {
  const s = createState(404);
  // Add 4 turrets to exceed 20 command power (4 * 6 = 24 draw > 20 gen)
  s.grid[1][2].building = { type: 'turret', tier: 1, hp: 70, maxHp: 70, connected: true };
  s.grid[3][2].building = { type: 'turret', tier: 1, hp: 70, maxHp: 70, connected: true };
  s.grid[2][1].building = { type: 'turret', tier: 1, hp: 70, maxHp: 70, connected: true };
  s.grid[2][3].building = { type: 'turret', tier: 1, hp: 70, maxHp: 70, connected: true };
  const initialPop = s.colonists;

  step(s, 'wait');

  assert.strictEqual(s.brownout, true);
  assert.ok(s.colonists < initialPop);
});

test('repair action restores damaged structure HP using minerals', () => {
  const s = createState(505);
  const cmd = s.grid[2][2].building;
  cmd.hp = 40;

  step(s, 'repair:2,2');

  assert.ok(cmd.hp > 40);
  assert.strictEqual(s.minerals, 55);
});

test('upgrade action promotes building to Tier 2 with increased stats', () => {
  const s = createState(606);
  s.minerals = 100;
  step(s, 'build:solar:2,3');

  step(s, 'upgrade:2,3');
  const b = s.grid[2][3].building;
  assert.strictEqual(b.tier, 2);
  assert.strictEqual(b.maxHp, 75);
});

test('laser turret intercepts hostile threat wave during invasion turn', () => {
  const s = createState(707);
  s.minerals = 120;
  step(s, 'build:turret:3,2'); // At turn 1 -> now turn 2
  s.turn = 5; // next step will be turn 5 threat wave

  step(s, 'wait'); // turn 5 wave
  assert.strictEqual(s.turn, 6);
  // Command core should survive wave
  assert.ok(s.grid[2][2].building.hp > 0);
});

test('illegal action throws error without state mutation', () => {
  const s = createState(808);
  s.minerals = 5;
  const jsonBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'build:reactor:0,0'); // Non-adjacent and unaffordable
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), jsonBefore);
});

test('same seed and sequence of construction yields deterministic state', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  for (let i = 0; i < 5; i++) {
    const legals = legalActions(s1);
    const act = legals[0];
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
