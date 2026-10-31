const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  SUMMIT_DISTANCE,
  UPGRADE_TYPES,
  getSlopeAngle,
  getUpgradeCost
} = require('./www/logic.js');

test('0175-hill-climb-racing: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.distance, 0);
  assert.equal(state.velocity, 8);
  assert.equal(state.pitchAngle, 0);
  assert.equal(state.fuel, 100);
  assert.equal(state.coins, 30);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:gas_accelerate'));
  assert.ok(actions.includes('action:brake_reverse'));
  assert.ok(actions.includes('action:tilt_forward'));
  assert.ok(actions.includes('action:tilt_backward'));
});

test('0175-hill-climb-racing: throttle accelerates vehicle and consumes fuel', () => {
  const state = createState(101);
  const initialFuel = state.fuel;
  const initialVel = state.velocity;

  const res = step(state, 'action:gas_accelerate');
  assert.ok(state.velocity > initialVel);
  assert.ok(state.fuel < initialFuel);
  assert.equal(res.done, false);
  assert.ok(res.reward !== 0);
});

test('0175-hill-climb-racing: brake slows down vehicle', () => {
  const state = createState(102);
  state.velocity = 20;

  step(state, 'action:brake_reverse');
  assert.ok(state.velocity < 20);
});

test('0175-hill-climb-racing: pitch tilt controls', () => {
  const state1 = createState(103);
  step(state1, 'action:tilt_forward');

  const state2 = createState(103);
  step(state2, 'action:tilt_backward');

  assert.ok(state1.pitchAngle < state2.pitchAngle);
});

test('0175-hill-climb-racing: garage upgrades consume coins and level up attributes', () => {
  const state = createState(105);
  state.coins = 100;
  assert.equal(state.upgrades.engine, 0);

  step(state, 'action:upgrade_vehicle:engine');
  assert.equal(state.upgrades.engine, 1);
  assert.equal(state.coins, 77); // 100 - 25 cost + 2 passive
});

test('0175-hill-climb-racing: fuel canisters replenish fuel and coins along the mountain', () => {
  const state = createState(106);
  state.distance = 95;
  state.velocity = 10;
  state.fuel = 20;
  state.lastFuelCanDistance = 0;

  step(state, 'action:tilt_forward'); // advances distance past 100m
  assert.ok(state.distance >= 100);
  assert.ok(state.fuel > 50); // refilled by +45
});

test('0175-hill-climb-racing: rollover crash causes defeat', () => {
  const state = createState(107);
  state.pitchAngle = 70;
  state.airborne = false;

  step(state, 'action:tilt_backward');
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
  assert.ok(state.gameMessage.includes('flipped'));
});

test('0175-hill-climb-racing: reaching summit triggers victory', () => {
  const state = createState(108);
  state.distance = 990;
  state.velocity = 15;
  state.fuel = 50;

  step(state, 'action:gas_accelerate');
  assert.ok(state.distance >= SUMMIT_DISTANCE);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
  assert.ok(score(state) > 5000);
});

test('0175-hill-climb-racing: determinism between identical seeds', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['action:gas_accelerate', 'action:tilt_forward', 'action:gas_accelerate', 'action:brake_reverse'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.equal(s1.distance, s2.distance);
  assert.equal(s1.velocity, s2.velocity);
  assert.equal(s1.pitchAngle, s2.pitchAngle);
  assert.equal(s1.fuel, s2.fuel);
  assert.equal(s1.coins, s2.coins);
  assert.equal(score(s1), score(s2));
});

test('0175-hill-climb-racing: legalActions fuzzing does not crash', () => {
  const state = createState(888);
  let steps = 0;
  while (!isOver(state) && steps < 60) {
    const actions = legalActions(state);
    assert.ok(actions.length > 0);
    const act = actions[steps % actions.length];
    const res = step(state, act);
    assert.equal(typeof res.reward, 'number');
    assert.equal(typeof res.done, 'boolean');
    steps++;
  }
});
