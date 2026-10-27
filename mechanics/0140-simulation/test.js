const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  LIFE_STAGE_NAMES,
  isGoldenZone
} = require('./www/logic.js');

test('createState initializes proto-planet at Stage 0 Barren Crust with initial sub-zero conditions', () => {
  const state = createState(42);
  assert.equal(state.epoch, 1);
  assert.equal(state.energy, 30);
  assert.equal(state.lifeStage, 0);
  assert.equal(state.temperature, -25);
  assert.equal(state.moisture, 8);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('action:deploy_comet_ice increases moisture and expends 10 energy', () => {
  const state = createState(10);
  const initMoist = state.moisture;
  step(state, 'action:deploy_comet_ice');
  assert.equal(state.moisture, initMoist + 15);
  assert.equal(state.energy, 20);
});

test('action:ignite_thermal_vents warms surface temperature by 10°C', () => {
  const state = createState(10);
  const initTemp = state.temperature;
  step(state, 'action:ignite_thermal_vents');
  assert.equal(state.temperature, initTemp + 10);
});

test('action:orbital_sunshade cools planet by 8°C', () => {
  const state = createState(10);
  const initTemp = state.temperature;
  step(state, 'action:orbital_sunshade');
  assert.equal(state.temperature, initTemp - 8);
});

test('action:seed_cyanobacteria synthesizes oxygen and advances to Stage 1', () => {
  const state = createState(10);
  state.moisture = 20; // meet moisture requirement
  step(state, 'action:seed_cyanobacteria');
  assert.equal(state.lifeStage, 1);
  assert.equal(state.oxygen > 1, true);
});

test('action:seed_flora cultivates forests and advances to Stage 2', () => {
  const state = createState(10);
  state.moisture = 35;
  state.temperature = 10;
  state.lifeStage = 1;

  step(state, 'action:seed_flora');
  assert.equal(state.lifeStage, 2);
  assert.equal(state.biomass >= 25, true);
});

test('action:introduce_fauna introduces animal life and advances to Stage 3', () => {
  const state = createState(10);
  state.oxygen = 20;
  state.lifeStage = 2;

  step(state, 'action:introduce_fauna');
  assert.equal(state.lifeStage, 3);
  assert.equal(state.biomass >= 30, true);
});

test('action:advance_epoch advances epoch counter and replenishes energy to maximum', () => {
  const state = createState(10);
  state.energy = 0;
  step(state, 'action:advance_epoch');
  assert.equal(state.epoch, 2);
  assert.equal(state.energy, 30);
});

test('sustaining Golden Zone stability for 3 consecutive epochs at Stage 4 achieves victory', () => {
  const state = createState(10);
  state.temperature = 20;
  state.oxygen = 21;
  state.moisture = 50;
  state.co2 = 40; // stable temperature feedback target
  state.biomass = 80;
  state.lifeStage = 3;
  state.stableEpochs = 2;

  assert.equal(isGoldenZone(state), true);

  const res = step(state, 'action:advance_epoch');
  assert.equal(state.lifeStage, 4);
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(res.done, true);
  assert.equal(res.reward > 100, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(1);
  const snap = JSON.stringify(state);
  assert.throws(() => {
    step(state, 'invalid:simulation:action');
  });
  assert.equal(JSON.stringify(state), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(818);
  const s2 = createState(818);

  step(s1, 'action:deploy_comet_ice');
  step(s2, 'action:deploy_comet_ice');
  step(s1, 'action:ignite_thermal_vents');
  step(s2, 'action:ignite_thermal_vents');

  assert.deepEqual(s1, s2);
});
