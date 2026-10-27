const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  calculatePower,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes Conveyor Core with baseline machines and components', () => {
  const state = createState(42);
  assert.equal(state.cycle, 1);
  assert.equal(state.credits, 400);
  assert.equal(state.beltLevel, 1);
  assert.equal(state.machines.miners, 1);
  assert.equal(state.machines.smelters, 1);
  assert.equal(state.machines.assemblers, 1);
  assert.equal(state.machines.generators, 2);
  assert.equal(state.items.copper, 8);
  assert.equal(state.items.silicon, 8);
  assert.equal(state.processorsExported, 0);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('calculatePower correctly determines electrical balance', () => {
  const state = createState(10);
  // Supply: 2 * 5 = 10 kW
  // Demand: 1 (miner) + 2 (smelter) + 3 (assembler) = 6 kW
  const p = calculatePower(state);
  assert.equal(p.supply, 10);
  assert.equal(p.demand, 6);
  assert.equal(p.balance, 4);
});

test('building machines adds equipment and deducts credits', () => {
  const state = createState(10);
  state.credits = 1000;

  step(state, 'action:build_miner');
  assert.equal(state.machines.miners, 2);
  assert.equal(state.credits, 920);

  step(state, 'action:build_smelter');
  assert.equal(state.machines.smelters, 2);
  assert.equal(state.credits, 800);

  step(state, 'action:build_assembler');
  assert.equal(state.machines.assemblers, 2);
  assert.equal(state.credits, 620);

  step(state, 'action:build_generator');
  assert.equal(state.machines.generators, 3);
  assert.equal(state.credits, 520);
});

test('upgrade_conveyors increases logistics belt tier', () => {
  const state = createState(10);
  state.credits = 500;

  step(state, 'action:upgrade_conveyors');
  assert.equal(state.beltLevel, 2);
  assert.equal(state.credits, 350);
});

test('cycle_factory routes materials and produces components', () => {
  const state = createState(10);
  state.items.wire = 10;
  state.items.wafers = 10;

  step(state, 'action:cycle_factory');
  assert.equal(state.cycle, 2);
  assert.equal(state.items.processors > 0 || state.items.gates > 0, true);
});

test('export_goods liquidates fabricated goods on the galactic market', () => {
  const state = createState(10);
  state.items.processors = 2;
  state.items.gates = 2;

  const actions = legalActions(state);
  assert.equal(actions.includes('action:export_goods'), true);

  const initCredits = state.credits;
  step(state, 'action:export_goods');

  assert.equal(state.items.processors, 0);
  assert.equal(state.items.gates, 0);
  assert.equal(state.processorsExported, 2);
  assert.equal(state.credits, initCredits + 2 * 220 + 2 * 60);
});

test('victory triggered when exporting 15+ processors with Belt Level 3 and 3500+ credits', () => {
  const state = createState(10);
  state.processorsExported = 15;
  state.beltLevel = 3;
  state.credits = 3600;

  step(state, 'action:cycle_factory');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when falling deeply into factory deficit', () => {
  const state = createState(10);
  state.credits = -350;

  step(state, 'action:cycle_factory');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws descriptive error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:overclock_antimatter');
  }, /Illegal action/);
});

test('seed determinism produces identical factory runs', () => {
  const s1 = createState(404);
  const s2 = createState(404);

  step(s1, 'action:cycle_factory');
  step(s2, 'action:cycle_factory');
  step(s1, 'action:build_miner');
  step(s2, 'action:build_miner');

  assert.deepEqual(s1, s2);
});
