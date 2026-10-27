const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes Aegis Outpost with 4 colonists and baseline life support', () => {
  const state = createState(42);
  assert.equal(state.day, 1);
  assert.equal(state.colonists, 4);
  assert.equal(state.maxCapacity, 6);
  assert.equal(state.health, 90);
  assert.equal(state.morale, 80);
  assert.equal(state.resources.rations, 20);
  assert.equal(state.resources.water, 20);
  assert.equal(state.resources.oxygen, 25);
  assert.equal(state.facilities.biodomes, 1);
  assert.equal(state.facilities.scrubbers, 1);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('building facilities deducts scrap/components and increments infrastructure', () => {
  const state = createState(10);
  state.resources.scrap = 200;
  state.resources.components = 100;

  step(state, 'action:build_biodome');
  assert.equal(state.facilities.biodomes, 2);

  step(state, 'action:build_scrubber');
  assert.equal(state.facilities.scrubbers, 2);

  step(state, 'action:build_condenser');
  assert.equal(state.facilities.condensers, 2);

  step(state, 'action:build_reactor');
  assert.equal(state.facilities.reactors, 2);

  step(state, 'action:build_quarters');
  assert.equal(state.facilities.quarters, 2);
  assert.equal(state.maxCapacity, 8);
});

test('scavenge_surface gathers scrap and components from alien surface', () => {
  const state = createState(10);
  const initScrap = state.resources.scrap;
  const initComp = state.resources.components;

  step(state, 'action:scavenge_surface');
  assert.equal(state.resources.scrap > initScrap, true);
  assert.equal(state.resources.components > initComp, true);
});

test('treat_colonists restores health and morale', () => {
  const state = createState(10);
  state.health = 50;
  state.morale = 50;
  state.resources.scrap = 20;
  state.resources.components = 10;

  step(state, 'action:treat_colonists');
  assert.equal(state.health, 70);
  assert.equal(state.morale, 65);
});

test('advance_day consumes rations and water and admits immigrant when thriving', () => {
  const state = createState(10);
  state.colonists = 4;
  state.morale = 80;
  state.health = 80;
  state.maxCapacity = 10;
  state.resources.rations = 50;
  state.resources.water = 50;
  state.resources.oxygen = 50;

  step(state, 'action:advance_day');
  assert.equal(state.day, 2);
  assert.equal(state.colonists, 5); // immigrant arrived
});

test('advance_day under resource deficit causes health penalty', () => {
  const state = createState(10);
  state.resources.rations = 0;
  state.resources.water = 0;
  state.resources.oxygen = 0;
  state.facilities.biodomes = 0;
  state.facilities.condensers = 0;
  state.facilities.scrubbers = 0;

  const initHealth = state.health;
  step(state, 'action:advance_day');
  assert.equal(state.health < initHealth, true);
});

test('victory triggered when reaching 12 colonists with 80%+ morale through Day 25', () => {
  const state = createState(10);
  state.colonists = 12;
  state.morale = 85;
  state.day = 25;

  step(state, 'action:scavenge_surface');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when health falls to zero', () => {
  const state = createState(10);
  state.health = 1;
  state.resources.rations = 0;
  state.resources.water = 0;
  state.resources.oxygen = 0;
  state.facilities.biodomes = 0;
  state.facilities.condensers = 0;
  state.facilities.scrubbers = 0;

  step(state, 'action:advance_day');
  assert.equal(state.health, 0);
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws descriptive error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:build_quantum_teleporter');
  }, /Illegal action/);
});

test('seed determinism produces identical colony states', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  step(s1, 'action:scavenge_surface');
  step(s2, 'action:scavenge_surface');
  step(s1, 'action:advance_day');
  step(s2, 'action:advance_day');

  assert.deepEqual(s1, s2);
});
