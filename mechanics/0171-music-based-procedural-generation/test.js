const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  TRACK_LENGTH
} = require('./www/logic.js');

test('0171-music-based-procedural-generation: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.lane, 1);
  assert.equal(state.shield, 100);
  assert.equal(state.energy, 30);
  assert.equal(state.measure, 0);
  assert.equal(state.track.length, TRACK_LENGTH);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:ride_beat'));
  assert.ok(actions.includes('action:shift_lane:left'));
  assert.ok(actions.includes('action:shift_lane:right'));
  assert.ok(actions.includes('action:pulse_sonic_blast'));
});

test('0171-music-based-procedural-generation: lane shifting clamped at highway edges', () => {
  const state = createState(101);
  step(state, 'action:shift_lane:left');
  assert.equal(state.lane, 0);

  const actionsLeft = legalActions(state);
  assert.equal(actionsLeft.includes('action:shift_lane:left'), false);
  assert.ok(actionsLeft.includes('action:shift_lane:right'));

  step(state, 'action:shift_lane:right');
  assert.equal(state.lane, 1);

  step(state, 'action:shift_lane:right');
  assert.equal(state.lane, 2);

  const actionsRight = legalActions(state);
  assert.equal(actionsRight.includes('action:shift_lane:right'), false);
});

test('0171-music-based-procedural-generation: sonic blast consumes energy and clears barriers', () => {
  const state = createState(202);
  state.energy = 25;
  const oldCleared = state.barriersCleared;

  step(state, 'action:pulse_sonic_blast');
  assert.equal(state.energy, 5);
  assert.equal(state.barriersCleared, oldCleared + 1);
});

test('0171-music-based-procedural-generation: overdrive invulnerability', () => {
  const state = createState(303);
  state.energy = 50;

  step(state, 'action:engage_overdrive');
  assert.equal(state.overdriveTurns, 3); // 4 minus 1 turn step
  assert.equal(state.energy, 20);
});

test('0171-music-based-procedural-generation: hazard collision reduces shield', () => {
  const state = createState(404);
  // Place hazard in current lane and measure
  state.track[state.measure].elements[state.lane] = 'hazard';

  step(state, 'action:ride_beat');
  assert.equal(state.shield, 75);
  assert.equal(state.combo, 0);
});

test('0171-music-based-procedural-generation: track completion achieves victory', () => {
  const state = createState(505);
  state.measure = TRACK_LENGTH - 1;
  state.shield = 80;
  // Clear any hazard at last measure
  state.track[state.measure].elements[state.lane] = 'harmonizer';

  const res = step(state, 'action:ride_beat');
  assert.equal(state.measure, TRACK_LENGTH);
  assert.equal(state.victory, true);
  assert.equal(res.done, true);
  assert.ok(score(state) >= 5000);
});

test('0171-music-based-procedural-generation: shield depletion triggers defeat', () => {
  const state = createState(606);
  state.shield = 20;
  state.track[state.measure].elements[state.lane] = 'hazard';

  step(state, 'action:ride_beat');
  assert.equal(state.shield, 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0171-music-based-procedural-generation: determinism with same seed and action sequence', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = [
    'action:ride_beat',
    'action:shift_lane:left',
    'action:ride_beat'
  ];

  for (const act of script) {
    if (!isOver(s1) && legalActions(s1).includes(act)) step(s1, act);
    if (!isOver(s2) && legalActions(s2).includes(act)) step(s2, act);
  }

  assert.equal(s1.prngState, s2.prngState);
  assert.equal(s1.measure, s2.measure);
  assert.equal(s1.shield, s2.shield);
  assert.equal(score(s1), score(s2));
});

test('0171-music-based-procedural-generation: bot contract fuzzing to completion', () => {
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
