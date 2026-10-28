const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  ROUTE_LENGTH_KM,
  GEAR_MAX_SPEED
} = require('./www/logic.js');

test('0174-driving: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.gear, 1);
  assert.equal(state.speed, 30);
  assert.equal(state.lane, 1);
  assert.equal(state.fuel, 100);
  assert.equal(state.fatigue, 0);
  assert.equal(state.cargoIntegrity, 100);
  assert.equal(state.distance, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:accelerate_throttle'));
  assert.ok(actions.includes('action:apply_service_brakes'));
  assert.ok(actions.includes('action:shift_lane:left'));
  assert.ok(actions.includes('action:shift_lane:right'));
});

test('0174-driving: acceleration respects transmission gear caps', () => {
  const state = createState(101);
  step(state, 'action:accelerate_throttle');
  assert.equal(state.speed, GEAR_MAX_SPEED[1]); // 40 km/h cap in gear 1

  step(state, 'action:shift_gear_up');
  assert.equal(state.gear, 2);

  step(state, 'action:accelerate_throttle');
  assert.ok(state.speed > 40);
});

test('0174-driving: service brakes reduce speed', () => {
  const state = createState(202);
  state.speed = 50;

  step(state, 'action:apply_service_brakes');
  assert.equal(state.speed, 20);
});

test('0174-driving: lane shifting clamped at 0 and 2', () => {
  const state = createState(303);
  step(state, 'action:shift_lane:left');
  assert.equal(state.lane, 0);

  const actionsLeft = legalActions(state);
  assert.equal(actionsLeft.includes('action:shift_lane:left'), false);
  assert.ok(actionsLeft.includes('action:shift_lane:right'));

  step(state, 'action:shift_lane:right');
  step(state, 'action:shift_lane:right');
  assert.equal(state.lane, 2);

  const actionsRight = legalActions(state);
  assert.equal(actionsRight.includes('action:shift_lane:right'), false);
});

test('0174-driving: service plaza refueling and sleeper cab resting', () => {
  const state = createState(404);
  state.fuel = 40;
  state.fatigue = 50;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:stop_at_fuel_depot'));
  assert.ok(actions.includes('action:rest_sleeper_cab'));

  step(state, 'action:stop_at_fuel_depot');
  assert.equal(state.fuel, 100);

  step(state, 'action:rest_sleeper_cab');
  assert.equal(state.fatigue, 0);
});

test('0174-driving: terminal cargo delivery achieves victory', () => {
  const state = createState(505);
  state.distance = ROUTE_LENGTH_KM;
  state.cargoIntegrity = 85;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:deliver_freight'));

  const res = step(state, 'action:deliver_freight');
  assert.equal(state.victory, true);
  assert.equal(res.done, true);
  assert.ok(score(state) >= 5000);
});

test('0174-driving: defeat on diesel exhaustion', () => {
  const state = createState(606);
  state.fuel = 1;
  state.distance = 50;

  step(state, 'action:accelerate_throttle');
  assert.equal(state.fuel, 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0174-driving: determinism on identical seed and action sequence', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = [
    'action:accelerate_throttle',
    'action:shift_lane:left',
    'action:apply_service_brakes'
  ];

  for (const act of script) {
    if (!isOver(s1) && legalActions(s1).includes(act)) step(s1, act);
    if (!isOver(s2) && legalActions(s2).includes(act)) step(s2, act);
  }

  assert.equal(s1.prngState, s2.prngState);
  assert.equal(s1.speed, s2.speed);
  assert.equal(s1.distance, s2.distance);
  assert.equal(score(s1), score(s2));
});

test('0174-driving: bot contract fuzzing to completion', () => {
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
