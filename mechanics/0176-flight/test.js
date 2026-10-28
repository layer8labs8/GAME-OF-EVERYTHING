const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  SKY_RINGS,
  RUNWAY_DISTANCE,
  STALL_SPEED
} = require('./www/logic.js');

test('0176-flight: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.altitude, 1200);
  assert.equal(state.airspeed, 130);
  assert.equal(state.throttle, 60);
  assert.equal(state.pitch, 0);
  assert.equal(state.bank, 0);
  assert.equal(state.fuel, 100);
  assert.equal(state.landingGear, false);
  assert.equal(state.ringsPassed, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:throttle_increase'));
  assert.ok(actions.includes('action:throttle_decrease'));
  assert.ok(actions.includes('action:pitch_up'));
  assert.ok(actions.includes('action:pitch_down'));
  assert.ok(actions.includes('action:bank_left'));
  assert.ok(actions.includes('action:bank_right'));
  assert.ok(actions.includes('action:level_wings'));
  assert.ok(actions.includes('action:toggle_landing_gear'));
});

test('0176-flight: throttle controls engine thrust and burns fuel', () => {
  const state = createState(101);
  const initialFuel = state.fuel;

  step(state, 'action:throttle_increase');
  assert.equal(state.throttle, 80);
  assert.ok(state.fuel < initialFuel);
});

test('0176-flight: pitch up climbs altitude', () => {
  const state = createState(102);
  const initialAlt = state.altitude;

  step(state, 'action:pitch_up');
  assert.ok(state.pitch > 0);
  assert.ok(state.altitude > initialAlt);
});

test('0176-flight: pitch down dives altitude', () => {
  const state = createState(103);
  const initialAlt = state.altitude;

  step(state, 'action:pitch_down');
  assert.ok(state.pitch < 0);
  assert.ok(state.altitude < initialAlt);
});

test('0176-flight: bank left and bank right', () => {
  const state1 = createState(104);
  step(state1, 'action:bank_left');
  assert.equal(state1.bank, -10);

  const state2 = createState(104);
  step(state2, 'action:bank_right');
  assert.equal(state2.bank, 10);
});

test('0176-flight: level wings dampens attitude angles', () => {
  const state = createState(105);
  state.pitch = 24;
  state.bank = -30;

  step(state, 'action:level_wings');
  assert.ok(state.pitch < 24);
  assert.ok(state.bank > -30);
});

test('0176-flight: landing gear toggles deployment', () => {
  const state = createState(106);
  assert.equal(state.landingGear, false);

  step(state, 'action:toggle_landing_gear');
  assert.equal(state.landingGear, true);

  step(state, 'action:toggle_landing_gear');
  assert.equal(state.landingGear, false);
});

test('0176-flight: flying through sky ring awards bonus fuel and points', () => {
  const state = createState(107);
  state.flightDistance = 190;
  state.altitude = 1500;
  state.bank = 0;
  state.fuel = 50;

  step(state, 'action:level_wings'); // pushes distance past 200m ring
  assert.equal(state.ringsPassed, 1);
  assert.ok(state.fuel >= 70); // refueled
  assert.ok(state.gameMessage.includes('AERO ACE'));
});

test('0176-flight: terrain collision causes defeat', () => {
  const state = createState(108);
  state.altitude = 50;
  state.flightDistance = 100; // far from runway

  step(state, 'action:pitch_down');
  assert.ok(state.altitude <= 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0176-flight: safe runway touchdown achieves victory', () => {
  const state = createState(109);
  state.flightDistance = RUNWAY_DISTANCE - 10;
  state.altitude = 50;
  state.airspeed = 100;
  state.pitch = 0;
  state.bank = 0;
  state.landingGear = true;

  step(state, 'action:level_wings');
  assert.ok(state.flightDistance >= RUNWAY_DISTANCE);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
  assert.ok(state.gameMessage.includes('TOUCHDOWN'));
  assert.ok(score(state) > 5000);
});

test('0176-flight: determinism between identical seeds and actions', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['action:pitch_up', 'action:throttle_increase', 'action:bank_left', 'action:level_wings'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.equal(s1.altitude, s2.altitude);
  assert.equal(s1.airspeed, s2.airspeed);
  assert.equal(s1.pitch, s2.pitch);
  assert.equal(s1.bank, s2.bank);
  assert.equal(s1.fuel, s2.fuel);
  assert.equal(score(s1), score(s2));
});

test('0176-flight: legalActions fuzzing does not crash', () => {
  const state = createState(777);
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
