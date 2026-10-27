const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  calculatePower,
  canFulfillContract,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes Star Foundry with starting infrastructure and resources', () => {
  const state = createState(42);
  assert.equal(state.cycle, 1);
  assert.equal(state.credits, 500);
  assert.equal(state.resources.ore, 10);
  assert.equal(state.resources.gas, 10);
  assert.equal(state.facilities.miners, 1);
  assert.equal(state.facilities.extractors, 1);
  assert.equal(state.facilities.smelters, 1);
  assert.equal(state.facilities.refineries, 1);
  assert.equal(state.facilities.solar, 2);
  assert.equal(state.contractsCompleted, 0);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('calculatePower calculates energy balance accurately', () => {
  const state = createState(10);
  // Solar: 2 * 4 = 8 MW
  // Demand: 1 (miner) + 1 (extractor) + 1 (smelter) + 1 (refinery) = 4 MW
  const power = calculatePower(state);
  assert.equal(power.supply, 8);
  assert.equal(power.demand, 4);
  assert.equal(power.balance, 4);
});

test('building facilities deducts credits and increases station infrastructure', () => {
  const state = createState(10);
  state.credits = 1000;

  step(state, 'action:build_miner');
  assert.equal(state.facilities.miners, 2);
  assert.equal(state.credits, 900);

  step(state, 'action:build_extractor');
  assert.equal(state.facilities.extractors, 2);
  assert.equal(state.credits, 800);

  step(state, 'action:build_smelter');
  assert.equal(state.facilities.smelters, 2);
  assert.equal(state.credits, 650);

  step(state, 'action:build_refinery');
  assert.equal(state.facilities.refineries, 2);
  assert.equal(state.credits, 500);

  step(state, 'action:build_solar');
  assert.equal(state.facilities.solar, 3);
  assert.equal(state.credits, 380);
});

test('cycle_logistics runs industrial manufacturing pipeline', () => {
  const state = createState(10);
  state.resources.ore = 10;
  state.resources.gas = 10;

  const initCredits = state.credits;
  step(state, 'action:cycle_logistics');

  assert.equal(state.cycle, 2);
  assert.equal(state.resources.alloy > 0, true);
  assert.equal(state.resources.polymer > 0, true);
  assert.equal(state.credits < initCredits, true); // station upkeep
});

test('fulfill_contract delivers goods and collects galactic rewards', () => {
  const state = createState(10);
  state.resources.alloy = 50;
  state.resources.polymer = 50;
  state.resources.circuit = 50;

  assert.equal(canFulfillContract(state), true);
  const actions = legalActions(state);
  assert.equal(actions.includes('action:fulfill_contract'), true);

  const prevCredits = state.credits;
  const reward = state.currentContract.rewardCredits;
  step(state, 'action:fulfill_contract');

  assert.equal(state.contractsCompleted, 1);
  assert.equal(state.credits, prevCredits + reward);
  assert.equal(state.currentContract.id, 2);
});

test('victory triggered upon completing 6 contracts with >= 4000 credits', () => {
  const state = createState(10);
  state.contractsCompleted = 6;
  state.credits = 4200;

  step(state, 'action:cycle_logistics');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when credits collapse below -400', () => {
  const state = createState(10);
  state.credits = -420;

  step(state, 'action:cycle_logistics');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws descriptive error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:warp_hyperdrive');
  }, /Illegal action/);
});

test('seed determinism produces identical game state sequences', () => {
  const s1 = createState(777);
  const s2 = createState(777);

  step(s1, 'action:cycle_logistics');
  step(s2, 'action:cycle_logistics');
  step(s1, 'action:build_miner');
  step(s2, 'action:build_miner');

  assert.deepEqual(s1, s2);
});
