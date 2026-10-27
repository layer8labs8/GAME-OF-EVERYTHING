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

test('createState initializes hunter at Valley Marshes with scout kit', () => {
  const state = createState(42);
  assert.equal(state.biome, 0);
  assert.equal(state.stamina, 100);
  assert.equal(state.scentMask, 80);
  assert.equal(state.ammo, 8);
  assert.equal(state.steadyAim, 90);
  assert.equal(state.funds, 300);
  assert.equal(state.currentTarget, null);
  assert.equal(state.harvestCount, 0);
  assert.equal(state.spookCount, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);
  assert.ok(score(state) > 0);
});

test('glassing with binoculars identifies animal and enables stalk', () => {
  const state = createState(100);
  assert.ok(legalActions(state).includes('action:glass_with_binoculars'));
  step(state, 'action:glass_with_binoculars');

  assert.ok(state.currentTarget !== null);
  assert.equal(state.currentTarget.species, 'Whitetail Buck');
  assert.equal(state.currentTarget.isDowned, false);
});

test('stalking and callers close range to target animal', () => {
  const state = createState(200);
  state.currentTarget = {
    species: 'Whitetail Buck',
    distance: 140,
    alert: 15,
    trophyScore: 70,
    isDowned: false,
    reward: 180
  };

  // Crawl stalk
  assert.ok(legalActions(state).includes('action:crawl_stalk'));
  step(state, 'action:crawl_stalk');
  assert.equal(state.currentTarget.distance, 110);

  // Animal caller
  assert.ok(legalActions(state).includes('action:use_animal_caller'));
  step(state, 'action:use_animal_caller');
  assert.equal(state.currentTarget.distance, 85);
});

test('vital rifle shot downs animal and harvesting awards guild bounty', () => {
  const state = createState(300);
  state.steadyAim = 100;
  state.currentTarget = {
    species: 'Whitetail Buck',
    distance: 30, // close range guarantees hit
    alert: 10,
    trophyScore: 70,
    isDowned: false,
    reward: 180
  };

  assert.ok(legalActions(state).includes('action:steady_aim_and_fire'));
  step(state, 'action:steady_aim_and_fire');
  assert.equal(state.currentTarget.isDowned, true);

  // Harvest
  assert.ok(legalActions(state).includes('action:harvest_downed_game'));
  const preFunds = state.funds;
  step(state, 'action:harvest_downed_game');

  assert.equal(state.funds, preFunds + 180);
  assert.equal(state.harvestCount, 1);
  assert.equal(state.currentTarget, null);
});

test('traveling between biomes reaches high alpine elevations', () => {
  const state = createState(400);
  assert.ok(legalActions(state).includes('action:travel_to_biome:1'));
  step(state, 'action:travel_to_biome:1');
  assert.equal(state.biome, 1);

  step(state, 'action:travel_to_biome:2');
  assert.equal(state.biome, 2);

  step(state, 'action:travel_to_biome:3');
  assert.equal(state.biome, 3);
});

test('resting at blind recovers stamina and steadies aim', () => {
  const state = createState(500);
  state.stamina = 40;
  state.steadyAim = 50;

  assert.ok(legalActions(state).includes('action:rest_at_blind'));
  step(state, 'action:rest_at_blind');

  assert.equal(state.stamina, 85);
  assert.equal(state.steadyAim, 80);
});

test('victory triggered when harvesting legendary moose with 6 harvests and funds', () => {
  const state = createState(600);
  state.biome = 3;
  state.harvestCount = 5;
  state.funds = 2100;
  state.currentTarget = {
    species: 'Legendary Great White Moose',
    distance: 30,
    alert: 10,
    trophyScore: 120,
    isDowned: true,
    reward: 1200
  };

  step(state, 'action:harvest_downed_game');

  assert.equal(state.harvestCount, 6);
  assert.equal(state.legendaryClaimed, true);
  assert.ok(state.funds >= 3200);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
});

test('defeat occurs when 5 targets are spooked', () => {
  const state = createState(700);
  state.spookCount = 4;
  state.currentTarget = {
    species: 'Rocky Mountain Elk',
    distance: 100,
    alert: 90, // alert >= 85 triggers spook at turn end
    trophyScore: 80,
    isDowned: false,
    reward: 280
  };

  step(state, 'action:rest_at_blind');

  assert.equal(state.spookCount, 5);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('illegal action throws descriptive error without mutating state', () => {
  const state = createState(800);
  state.funds = 10; // cannot restock supplies requiring $50
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'action:restock_supplies');
  }, /Illegal hunting action/);

  assert.equal(JSON.stringify(state), snapshot);
});

test('seed determinism produces identical tracking encounters', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  assert.deepEqual(s1, s2);
  step(s1, 'action:glass_with_binoculars');
  step(s2, 'action:glass_with_binoculars');
  assert.deepEqual(s1, s2);
});
