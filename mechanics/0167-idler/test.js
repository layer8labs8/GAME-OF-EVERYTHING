const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  GENERATOR_TYPES,
  getGeneratorCost
} = require('./www/logic.js');

test('0167-idler: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.energy, 25);
  assert.equal(state.neutrons, 0);
  assert.equal(state.darkMatter, 0);
  assert.equal(state.coreTemp, 20);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:pulse_reactor_core'));
  assert.ok(actions.includes('action:cycle_cryo_coolant'));
  assert.ok(actions.includes('action:purchase_generator:solenoid'));
});

test('0167-idler: manual pulsing and purchasing generators', () => {
  const state = createState(101);
  const oldEnergy = state.energy;

  step(state, 'action:pulse_reactor_core');
  assert.ok(state.energy > oldEnergy);

  // Buy solenoid
  const actions = legalActions(state);
  assert.ok(actions.includes('action:purchase_generator:solenoid'));
  step(state, 'action:purchase_generator:solenoid');
  assert.equal(state.generators.solenoid, 1);
});

test('0167-idler: automated idle generation over simulation steps', () => {
  const state = createState(202);
  state.generators.solenoid = 5;
  state.generators.injector = 2;

  const energyBefore = state.energy;
  step(state, 'action:pulse_reactor_core');
  assert.ok(state.energy > energyBefore + 15);
});

test('0167-idler: thermal management and cryo coolant cycling', () => {
  const state = createState(303);
  state.coreTemp = 85;

  step(state, 'action:cycle_cryo_coolant');
  assert.ok(state.coreTemp <= 55);
});

test('0167-idler: plasma overclock multiplier', () => {
  const state = createState(404);
  step(state, 'action:engage_plasma_overclock');
  assert.equal(state.overclockTurns, 3); // 4 minus 1 turn step
  assert.ok(state.coreTemp > 20);
});

test('0167-idler: quantum overdrive prestige resets generators and awards dark matter', () => {
  const state = createState(505);
  state.neutrons = 100;
  state.generators.solenoid = 10;
  state.generators.injector = 4;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:quantum_overdrive_prestige'));

  step(state, 'action:quantum_overdrive_prestige');
  assert.equal(state.darkMatter, 1);
  assert.equal(state.prestigeCount, 1);
  assert.equal(state.generators.solenoid, 0);
  assert.equal(state.generators.injector, 0);
  assert.ok(score(state) >= 1000);
});

test('0167-idler: stellar ignition victory condition', () => {
  const state = createState(606);
  state.generators.dysonRelay = 1;
  state.darkMatter = 2;
  state.energy = 25000;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:achieve_stellar_ignition'));

  const res = step(state, 'action:achieve_stellar_ignition');
  assert.equal(state.victory, true);
  assert.equal(res.done, true);
  assert.ok(score(state) >= 10000);
});

test('0167-idler: core meltdown defeat on thermal failure', () => {
  const state = createState(707);
  state.coreTemp = 99;
  state.generators.dysonRelay = 5;

  step(state, 'action:pulse_reactor_core');
  assert.equal(state.coreTemp, 100);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0167-idler: determinism on identical seed and action sequence', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = [
    'action:pulse_reactor_core',
    'action:purchase_generator:solenoid',
    'action:pulse_reactor_core'
  ];

  for (const act of script) {
    if (!isOver(s1) && legalActions(s1).includes(act)) step(s1, act);
    if (!isOver(s2) && legalActions(s2).includes(act)) step(s2, act);
  }

  assert.equal(s1.prngState, s2.prngState);
  assert.equal(s1.energy, s2.energy);
  assert.equal(s1.coreTemp, s2.coreTemp);
  assert.equal(score(s1), score(s2));
});

test('0167-idler: bot contract fuzzing to completion', () => {
  const state = createState(999);
  let steps = 0;

  while (!isOver(state) && steps < state.maxTurns + 50) {
    const actions = legalActions(state);
    assert.ok(actions.length > 0, 'Legal actions must not be empty');
    const act = actions[steps % actions.length];
    step(state, act);
    steps++;
  }

  assert.ok(isOver(state));
  assert.ok(score(state) >= 0);
});
