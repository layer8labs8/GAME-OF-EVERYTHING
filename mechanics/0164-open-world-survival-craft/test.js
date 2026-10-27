const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  BIOME_NAMES
} = require('./www/logic.js');

test('0164-open-world-survival-craft: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.biome, 0);
  assert.equal(state.health, 100);
  assert.equal(state.hunger, 90);
  assert.equal(state.thirst, 90);
  assert.equal(state.stamina, 100);
  assert.equal(state.hasCampfire, false);
  assert.equal(state.hasWorkbench, false);
  assert.equal(state.hasShelter, false);
  assert.equal(state.hasSmelter, false);
  assert.equal(state.hasIronTools, false);
  assert.equal(state.hasSignalBeacon, false);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:gather_fiber_and_flint'));
  assert.ok(actions.includes('action:chop_trees'));
  assert.ok(actions.includes('action:rest_at_shelter'));
});

test('0164-open-world-survival-craft: gathering resources and chopping wood', () => {
  const state = createState(101);
  const oldFiber = state.fiber;
  const oldFlint = state.flint;
  step(state, 'action:gather_fiber_and_flint');
  assert.ok(state.fiber > oldFiber);
  assert.ok(state.flint > oldFlint);

  const oldWood = state.wood;
  const oldStamina = state.stamina;
  step(state, 'action:chop_trees');
  assert.ok(state.wood > oldWood);
  assert.equal(state.stamina, oldStamina - 15);
});

test('0164-open-world-survival-craft: crafting campfire and workbench', () => {
  const state = createState(202);
  state.wood = 20;
  state.stone = 10;
  state.flint = 5;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:craft_campfire'));
  assert.ok(actions.includes('action:craft_workbench'));

  step(state, 'action:craft_campfire');
  assert.equal(state.hasCampfire, true);

  step(state, 'action:craft_workbench');
  assert.equal(state.hasWorkbench, true);
  assert.equal(state.structuresBuilt, 2);
});

test('0164-open-world-survival-craft: cooking rations and boiling water', () => {
  const state = createState(303);
  state.hasCampfire = true;
  state.rawMeat = 2;
  state.wood = 5;

  step(state, 'action:cook_rations');
  assert.equal(state.cookedRations, 3); // starts with 2
  assert.equal(state.rawMeat, 1);

  step(state, 'action:purify_water');
  assert.equal(state.purifiedWater, 4); // starts with 2, gains 2
});

test('0164-open-world-survival-craft: consuming food and water restores vitals', () => {
  const state = createState(404);
  state.hunger = 40;
  state.thirst = 30;
  state.health = 60;
  state.stamina = 50;

  step(state, 'action:drink_water');
  assert.ok(state.thirst > 30);
  assert.ok(state.stamina > 50);

  step(state, 'action:eat_cooked_ration');
  assert.ok(state.hunger > 40);
  assert.ok(state.health > 60);
});

test('0164-open-world-survival-craft: metallurgy and tool upgrades', () => {
  const state = createState(505);
  state.hasWorkbench = true;
  state.hasSmelter = true;
  state.ironOre = 6;
  state.wood = 20;

  step(state, 'action:smelt_iron');
  assert.equal(state.ironIngots, 1);
  assert.equal(state.ironOre, 4);

  state.ironIngots = 4;
  const actions = legalActions(state);
  assert.ok(actions.includes('action:upgrade_tools_to_iron'));

  step(state, 'action:upgrade_tools_to_iron');
  assert.equal(state.hasIronTools, true);
  assert.ok(score(state) >= 500);
});

test('0164-open-world-survival-craft: travel, beacon assembly, and escape victory', () => {
  const state = createState(606);
  state.hasWorkbench = true;
  state.stamina = 80;

  // Travel to Ancient Ruins (biome 3)
  step(state, 'action:travel_to_biome:3');
  assert.equal(state.biome, 3);

  state.ironIngots = 5;
  state.wood = 15;
  state.fiber = 10;

  const actions = legalActions(state);
  assert.ok(actions.includes('action:craft_signal_beacon'));

  step(state, 'action:craft_signal_beacon');
  assert.equal(state.hasSignalBeacon, true);

  const finalActions = legalActions(state);
  assert.ok(finalActions.includes('action:escape_wilderness'));

  const res = step(state, 'action:escape_wilderness');
  assert.equal(state.victory, true);
  assert.equal(res.done, true);
  assert.ok(score(state) >= 3000);
});

test('0164-open-world-survival-craft: starvation and defeat', () => {
  const state = createState(707);
  state.health = 5;
  state.hunger = 0;
  state.thirst = 0;

  step(state, 'action:gather_fiber_and_flint');
  assert.equal(state.health, 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0164-open-world-survival-craft: determinism with same seed and action sequence', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = [
    'action:gather_fiber_and_flint',
    'action:chop_trees',
    'action:rest_at_shelter'
  ];

  for (const act of script) {
    if (!isOver(s1) && legalActions(s1).includes(act)) step(s1, act);
    if (!isOver(s2) && legalActions(s2).includes(act)) step(s2, act);
  }

  assert.equal(s1.prngState, s2.prngState);
  assert.equal(s1.wood, s2.wood);
  assert.equal(s1.fiber, s2.fiber);
  assert.equal(s1.health, s2.health);
  assert.equal(score(s1), score(s2));
});

test('0164-open-world-survival-craft: bot contract fuzzing to completion', () => {
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
