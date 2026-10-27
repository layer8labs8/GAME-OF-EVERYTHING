const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  GRID_SIZE,
  SECTOR_TYPES
} = require('./www/logic.js');

test('createState initializes submersible at (0, 0) with full battery', () => {
  const state = createState(42);
  assert.equal(state.x, 0);
  assert.equal(state.y, 0);
  assert.equal(state.battery, 60);
  assert.equal(state.charted['0,0'], true);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('move:east shifts coordinates, consumes 2 battery, and charts sector (1, 0)', () => {
  const state = createState(10);
  step(state, 'move:east');
  assert.equal(state.x, 1);
  assert.equal(state.y, 0);
  assert.equal(state.battery, 58);
  assert.equal(state.charted['1,0'], true);
});

test('action:sonar_pulse consumes 5 battery and reveals 3x3 surrounding radius', () => {
  const state = createState(10);
  step(state, 'move:east');
  step(state, 'move:south');
  const preCharted = Object.keys(state.charted).length;

  step(state, 'action:sonar_pulse');
  const postCharted = Object.keys(state.charted).length;
  assert.equal(postCharted > preCharted, true);
  assert.equal(state.battery, 60 - 4 - 5);
});

test('action:harness_vent at vent sector recharges submersible battery', () => {
  const state = createState(10);
  state.x = 1;
  state.y = 3; // Hydrothermal Vent location
  state.battery = 20;

  const acts = legalActions(state);
  assert.equal(acts.includes('action:harness_vent'), true);

  step(state, 'action:harness_vent');
  assert.equal(state.battery, 50);
});

test('action:survey_specimen surveys anomaly and increments specimensCount', () => {
  const state = createState(10);
  state.x = 2;
  state.y = 0; // Bioluminescent Reef location
  const initScore = state.score;

  const acts = legalActions(state);
  assert.equal(acts.includes('action:survey_specimen'), true);

  step(state, 'action:survey_specimen');
  assert.equal(state.specimensCount, 1);
  assert.equal(state.score > initScore, true);
});

test('surveying Monolith at (5, 5) with >= 12 charted sectors achieves victory', () => {
  const state = createState(10);
  state.x = 5;
  state.y = 5;
  // Chart 14 sectors
  for (let i = 0; i < 14; i++) {
    state.charted[i + ',0'] = true;
  }

  const acts = legalActions(state);
  assert.equal(acts.includes('action:survey_monolith'), true);

  const res = step(state, 'action:survey_monolith');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(res.done, true);
  assert.equal(res.reward > 50, true);
});

test('battery depletion triggers mission failure', () => {
  const state = createState(10);
  state.battery = 2;
  step(state, 'move:south');
  assert.equal(state.battery, 0);
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws without mutating state', () => {
  const state = createState(1);
  const snap = JSON.stringify(state);
  assert.throws(() => {
    step(state, 'move:invalid:northpole');
  });
  assert.equal(JSON.stringify(state), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(333);
  const s2 = createState(333);

  step(s1, 'move:east');
  step(s2, 'move:east');
  step(s1, 'move:south');
  step(s2, 'move:south');

  assert.deepEqual(s1, s2);
});
