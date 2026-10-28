const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  SECTORS,
  CIRCUIT_LENGTH,
  GOLD_TARGET_TIME
} = require('./www/logic.js');

test('0179-time-attack: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.distance, 0);
  assert.equal(state.speed, 90);
  assert.equal(state.timeElapsed, 0);
  assert.equal(state.boost, 75);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:throttle_accelerate'));
  assert.ok(actions.includes('action:apex_brake'));
  assert.ok(actions.includes('action:steer_inside_curb'));
  assert.ok(actions.includes('action:steer_outside_line'));
  assert.ok(actions.includes('action:boost_overdrive'));
  assert.ok(actions.includes('action:maintain_coasting'));
});

test('0179-time-attack: throttle accelerates speed and advances distance', () => {
  const state = createState(101);
  const initSpeed = state.speed;

  step(state, 'action:throttle_accelerate');
  assert.ok(state.speed > initSpeed);
  assert.ok(state.distance > 0);
  assert.ok(state.timeElapsed > 0);
});

test('0179-time-attack: apex brake decelerates speed', () => {
  const state = createState(102);
  state.speed = 200;

  step(state, 'action:apex_brake');
  assert.ok(state.speed < 200);
});

test('0179-time-attack: steering adjusts racing line', () => {
  const s1 = createState(103);
  step(s1, 'action:steer_inside_curb');
  assert.ok(s1.line < 0);

  const s2 = createState(103);
  step(s2, 'action:steer_outside_line');
  assert.ok(s2.line > 0);
});

test('0179-time-attack: boost overdrive consumes boost and surges speed', () => {
  const state = createState(104);
  assert.equal(state.boost, 75);
  const initSpeed = state.speed;

  step(state, 'action:boost_overdrive');
  assert.equal(state.boost, 50);
  assert.ok(state.speed >= initSpeed + 50);
});

test('0179-time-attack: coasting cools tire heat', () => {
  const state = createState(105);
  state.tireHeat = 90;

  step(state, 'action:maintain_coasting');
  assert.ok(state.tireHeat < 90);
});

test('0179-time-attack: barrier impact at high speed causes defeat', () => {
  const state = createState(106);
  state.line = 85;
  state.speed = 250;

  step(state, 'action:steer_outside_line');
  assert.ok(Math.abs(state.line) >= 95);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
  assert.ok(state.gameMessage.includes('collision'));
});

test('0179-time-attack: crossing finish line within gold time achieves victory', () => {
  const state = createState(107);
  state.distance = CIRCUIT_LENGTH - 20;
  state.speed = 220;
  state.timeElapsed = 500; // well below 650ds

  step(state, 'action:throttle_accelerate');
  assert.ok(state.distance >= CIRCUIT_LENGTH);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
  assert.ok(score(state) > 50000);
});

test('0179-time-attack: determinism across identical seeds and actions', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['action:throttle_accelerate', 'action:steer_inside_curb', 'action:maintain_coasting'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.equal(s1.distance, s2.distance);
  assert.equal(s1.speed, s2.speed);
  assert.equal(s1.timeElapsed, s2.timeElapsed);
  assert.equal(s1.line, s2.line);
  assert.equal(score(s1), score(s2));
});

test('0179-time-attack: legalActions fuzzing does not crash', () => {
  const state = createState(333);
  let steps = 0;
  while (!isOver(state) && steps < 50) {
    const actions = legalActions(state);
    assert.ok(actions.length > 0);
    const act = actions[steps % actions.length];
    const res = step(state, act);
    assert.equal(typeof res.reward, 'number');
    assert.equal(typeof res.done, 'boolean');
    steps++;
  }
});
