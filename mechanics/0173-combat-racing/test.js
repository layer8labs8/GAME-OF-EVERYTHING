const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  RACE_FINISH_KM
} = require('./www/logic.js');

test('0173-combat-racing: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.lane, 1);
  assert.equal(state.hull, 100);
  assert.equal(state.nitro, 80);
  assert.equal(state.vulcanRounds, 24);
  assert.equal(state.homingMissiles, 4);
  assert.ok(state.rival !== null);
  assert.equal(state.rivalsWrecked, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:cruise_forward'));
  assert.ok(actions.includes('action:shift_lane:left'));
  assert.ok(actions.includes('action:shift_lane:right'));
  assert.ok(actions.includes('action:fire_vulcan_cannon'));
  assert.ok(actions.includes('action:launch_homing_missile'));
  assert.ok(actions.includes('action:burn_nitro_boost'));
});

test('0173-combat-racing: lane shifting clamped within track borders', () => {
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

test('0173-combat-racing: vulcan cannon and homing missile attacks', () => {
  const state = createState(202);
  const startVulcan = state.vulcanRounds;
  const startHp = state.rival.hp;

  step(state, 'action:fire_vulcan_cannon');
  assert.equal(state.vulcanRounds, startVulcan - 2);
  assert.ok(state.rival.hp < startHp);

  const startMissiles = state.homingMissiles;
  step(state, 'action:launch_homing_missile');
  assert.equal(state.homingMissiles, startMissiles - 1);
});

test('0173-combat-racing: destroying rival awards scrap and spawns new contender', () => {
  const state = createState(303);
  state.rival.hp = 10;

  step(state, 'action:fire_vulcan_cannon');
  assert.equal(state.rivalsWrecked, 1);
  assert.ok(state.rival !== null);
});

test('0173-combat-racing: nitro boost acceleration', () => {
  const state = createState(404);
  const distBefore = state.raceDistance;

  step(state, 'action:burn_nitro_boost');
  assert.equal(state.nitro, 60);
  assert.ok(state.raceDistance >= distBefore + 4);
});

test('0173-combat-racing: oil slick and repair nanites', () => {
  const state = createState(505);
  state.hull = 60;
  state.rival.dist = 10;

  step(state, 'action:deploy_oil_slick');
  assert.equal(state.oilSlicks, 1);
  assert.ok(state.rival.dist > 20);

  step(state, 'action:repair_armor_nanites');
  assert.equal(state.hull, 90);
});

test('0173-combat-racing: race finish with wrecks achieves victory', () => {
  const state = createState(606);
  state.raceDistance = RACE_FINISH_KM - 2;
  state.rivalsWrecked = 2;
  state.hull = 80;

  const res = step(state, 'action:cruise_forward');
  assert.equal(state.raceDistance, RACE_FINISH_KM);
  assert.equal(state.victory, true);
  assert.equal(res.done, true);
  assert.ok(score(state) >= 5000);
});

test('0173-combat-racing: hull destruction causes defeat', () => {
  const state = createState(707);
  state.hull = 10;
  state.rival.dist = 8;
  state.rival.lane = state.lane;
  state.rival.damage = 25;

  step(state, 'action:cruise_forward');
  assert.equal(state.hull, 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0173-combat-racing: determinism on identical seed and action sequence', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = [
    'action:cruise_forward',
    'action:shift_lane:left',
    'action:cruise_forward'
  ];

  for (const act of script) {
    if (!isOver(s1) && legalActions(s1).includes(act)) step(s1, act);
    if (!isOver(s2) && legalActions(s2).includes(act)) step(s2, act);
  }

  assert.equal(s1.prngState, s2.prngState);
  assert.equal(s1.lane, s2.lane);
  assert.equal(s1.hull, s2.hull);
  assert.equal(score(s1), score(s2));
});

test('0173-combat-racing: bot contract fuzzing to completion', () => {
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
