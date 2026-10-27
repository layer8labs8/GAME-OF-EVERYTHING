const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  FACILITY_TYPES,
  getFacilityCost
} = require('./www/logic.js');

test('0168-incremental: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.matter, 20);
  assert.equal(state.energy, 0);
  assert.equal(state.cubits, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:synthesize_matter'));
  assert.ok(actions.includes('action:purchase_facility:synthesizer'));
});

test('0168-incremental: manual matter synthesis and building facilities', () => {
  const state = createState(101);
  const oldMatter = state.matter;

  step(state, 'action:synthesize_matter');
  assert.ok(state.matter > oldMatter);

  step(state, 'action:purchase_facility:synthesizer');
  assert.equal(state.facilities.synthesizer, 1);
});

test('0168-incremental: researches enhance multipliers', () => {
  const state = createState(202);
  state.matter = 200;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:research_matter_compression'));

  step(state, 'action:research_matter_compression');
  assert.equal(state.researches.matterCompression, true);
  assert.ok(score(state) >= 200);
});

test('0168-incremental: automated idle generation over steps', () => {
  const state = createState(303);
  state.facilities.synthesizer = 5;
  state.facilities.splitter = 2;

  const mBefore = state.matter;
  const eBefore = state.energy;
  step(state, 'action:synthesize_matter');
  assert.ok(state.matter > mBefore + 15);
  assert.ok(state.energy > eBefore);
});

test('0168-incremental: quantum inversion prestige awards cubits', () => {
  const state = createState(404);
  state.energy = 150;
  state.facilities.synthesizer = 10;
  state.facilities.splitter = 4;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:quantum_inversion_prestige'));

  step(state, 'action:quantum_inversion_prestige');
  assert.equal(state.cubits, 1);
  assert.equal(state.inversionsPerformed, 1);
  assert.equal(state.facilities.synthesizer, 0);
  assert.equal(state.facilities.splitter, 0);
  assert.ok(score(state) >= 1500);
});

test('0168-incremental: universal genesis victory', () => {
  const state = createState(505);
  state.facilities.singularityEngine = 1;
  state.cubits = 2;
  state.matter = 50000;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:trigger_universal_genesis'));

  const res = step(state, 'action:trigger_universal_genesis');
  assert.equal(state.victory, true);
  assert.equal(res.done, true);
  assert.ok(score(state) >= 10000);
});

test('0168-incremental: defeat on max turns without genesis', () => {
  const state = createState(606);
  state.turns = state.maxTurns - 1;

  step(state, 'action:synthesize_matter');
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0168-incremental: determinism on identical seed and action sequence', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = [
    'action:synthesize_matter',
    'action:purchase_facility:synthesizer',
    'action:synthesize_matter'
  ];

  for (const act of script) {
    if (!isOver(s1) && legalActions(s1).includes(act)) step(s1, act);
    if (!isOver(s2) && legalActions(s2).includes(act)) step(s2, act);
  }

  assert.equal(s1.prngState, s2.prngState);
  assert.equal(s1.matter, s2.matter);
  assert.equal(s1.energy, s2.energy);
  assert.equal(score(s1), score(s2));
});

test('0168-incremental: bot contract fuzzing to completion', () => {
  const state = createState(999);
  let steps = 0;

  while (!isOver(state) && steps < 200) {
    const actions = legalActions(state);
    assert.ok(actions.length > 0, 'Legal actions must not be empty');
    const act = actions[steps % actions.length];
    step(state, act);
    steps++;
  }

  assert.ok(isOver(state));
  assert.ok(score(state) >= 0);
});
