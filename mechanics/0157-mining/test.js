const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  cargoWeight
} = require('./www/logic.js');

test('createState initializes subterranean drill rig at collar surface', () => {
  const state = createState(42);
  assert.equal(state.depth, 0);
  assert.equal(state.drillDurability, 100);
  assert.equal(state.fuel, 80);
  assert.equal(state.shaftIntegrity, 100);
  assert.equal(state.cash, 250);
  assert.equal(state.cargoCapacity, 6);
  assert.equal(state.drillTier, 1);
  assert.equal(cargoWeight(state), 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);
  assert.ok(score(state) > 0);
});

test('drilling downward penetrates subterranean strata and gathers mineral samples', () => {
  const state = createState(100);
  assert.ok(legalActions(state).includes('action:drill_downward'));
  step(state, 'action:drill_downward');

  assert.equal(state.depth, 25);
  assert.equal(state.fuel, 70);
  assert.ok(state.drillDurability < 100);
  assert.equal(state.cargo.coal, 1);
  assert.equal(cargoWeight(state), 1);
});

test('extract_rich_vein targets concentrated mineral pockets at depth', () => {
  const state = createState(200);
  state.depth = 100; // Sedimentary bedrock (iron)
  assert.ok(legalActions(state).includes('action:extract_rich_vein'));
  step(state, 'action:extract_rich_vein');

  assert.equal(state.cargo.iron, 2);
  assert.equal(cargoWeight(state), 2);
});

test('surface_haul_and_sell ascends to surface depot and converts minerals to cash', () => {
  const state = createState(300);
  state.depth = 100;
  state.cargo.iron = 2;
  state.cargo.coal = 1;
  const initialCash = state.cash;

  assert.ok(legalActions(state).includes('action:surface_haul_and_sell'));
  step(state, 'action:surface_haul_and_sell');

  assert.equal(state.depth, 0);
  assert.equal(cargoWeight(state), 0);
  assert.ok(state.cash > initialCash);
  assert.equal(state.totalOreSold, 3);
});

test('surface maintenance restores fuel and bit durability', () => {
  const state = createState(400);
  state.fuel = 30;
  state.drillDurability = 50;
  state.cash = 150;

  assert.ok(legalActions(state).includes('action:refuel_and_repair'));
  step(state, 'action:refuel_and_repair');

  assert.equal(state.cash, 90);
  assert.equal(state.fuel, 75);
  assert.equal(state.drillDurability, 90);
});

test('shaft struts reinforce tunnel integrity against cave-ins', () => {
  const state = createState(500);
  state.shaftIntegrity = 50;
  state.cash = 100;

  assert.ok(legalActions(state).includes('action:install_shaft_struts'));
  step(state, 'action:install_shaft_struts');

  assert.equal(state.shaftIntegrity, 85);
  assert.equal(state.cash, 55);
});

test('upgrading drill bit and expanding hopper increases capabilities', () => {
  const state = createState(600);
  state.cash = 400;

  // Drill upgrade
  assert.ok(legalActions(state).includes('action:upgrade_drill_bit'));
  step(state, 'action:upgrade_drill_bit');
  assert.equal(state.drillTier, 2);

  // Hopper expansion
  assert.ok(legalActions(state).includes('action:expand_cargo_hopper'));
  step(state, 'action:expand_cargo_hopper');
  assert.equal(state.cargoCapacity, 10);
});

test('victory triggered when reaching lithospheric core with diamonds and cash', () => {
  const state = createState(700);
  state.depth = 325;
  state.fuel = 50;
  state.cash = 3600;
  state.diamondsRecovered = 2;

  // Drill once more into >= 350m depth
  step(state, 'action:drill_downward');
  assert.ok(state.depth >= 350);
  assert.ok(state.diamondsRecovered >= 3);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
});

test('defeat occurs when shaft collapses from structural failure', () => {
  const state = createState(800);
  state.depth = 100;
  state.shaftIntegrity = 2; // will drop to 0 on drill
  step(state, 'action:drill_downward');

  assert.equal(state.shaftIntegrity, 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('illegal action throws descriptive error without mutating state', () => {
  const state = createState(900);
  state.cash = 10; // cannot afford drill upgrade
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'action:upgrade_drill_bit');
  }, /Illegal mining action/);

  assert.equal(JSON.stringify(state), snapshot);
});

test('seed determinism produces identical excavation trajectory', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  assert.deepEqual(s1, s2);
  step(s1, 'action:drill_downward');
  step(s2, 'action:drill_downward');
  assert.deepEqual(s1, s2);
});
