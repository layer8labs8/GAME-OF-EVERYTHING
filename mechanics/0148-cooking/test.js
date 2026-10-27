const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MENU_ITEMS,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes Bistro Rush with starting pantry and active order tickets', () => {
  const state = createState(42);
  assert.equal(state.serviceHour, 18);
  assert.equal(state.revenue, 300);
  assert.equal(state.critique, 75);
  assert.equal(state.cleanPlates, 4);
  assert.equal(state.pantry.rawProduce, 8);
  assert.equal(state.pantry.rawMeat, 6);
  assert.equal(state.station.platedDishes, 1);
  assert.equal(state.orders.length, 2);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('prep_produce consumes raw vegetables to create prepped portions', () => {
  const state = createState(10);
  const initRaw = state.pantry.rawProduce;
  const initPrep = state.station.preppedProduce;

  step(state, 'action:prep_produce');
  assert.equal(state.pantry.rawProduce, initRaw - 2);
  assert.equal(state.station.preppedProduce, initPrep + 2);
});

test('cook_stove cooks raw meat on the skillet', () => {
  const state = createState(10);
  const initMeat = state.pantry.rawMeat;
  const initCooked = state.station.cookedPortions;

  step(state, 'action:cook_stove');
  assert.equal(state.pantry.rawMeat, initMeat - 2);
  assert.equal(state.station.cookedPortions, initCooked + 2);
});

test('plate_dish combines prepped portions onto clean plate', () => {
  const state = createState(10);
  state.cleanPlates = 3;
  state.station.preppedProduce = 2;
  state.station.cookedPortions = 2;
  state.station.platedDishes = 0;

  step(state, 'action:plate_dish');
  assert.equal(state.station.platedDishes, 1);
  assert.equal(state.cleanPlates, 2);
  assert.equal(state.station.preppedProduce, 1);
  assert.equal(state.station.cookedPortions, 1);
});

test('serve_order delivers meal, earning revenue and critique bonus', () => {
  const state = createState(10);
  state.station.platedDishes = 1;
  const initRev = state.revenue;
  const initCrit = state.critique;

  step(state, 'action:serve_order');
  assert.equal(state.station.platedDishes, 0);
  assert.equal(state.revenue > initRev, true);
  assert.equal(state.critique, initCrit + 3);
  assert.equal(state.dishesServed, 1);
});

test('wash_dishes sanitizes used plateware', () => {
  const state = createState(10);
  state.cleanPlates = 1;

  step(state, 'action:wash_dishes');
  assert.equal(state.cleanPlates, 3);
});

test('restock_pantry purchases fresh bulk produce and meat', () => {
  const state = createState(10);
  state.revenue = 500;
  state.pantry.rawProduce = 2;
  state.pantry.rawMeat = 2;

  step(state, 'action:restock_pantry');
  assert.equal(state.revenue, 450);
  assert.equal(state.pantry.rawProduce, 8);
  assert.equal(state.pantry.rawMeat, 6);
});

test('advance_rush steps clock and ticks order patience', () => {
  const state = createState(10);
  const initPatience = state.orders[0].patience;

  step(state, 'action:advance_rush');
  assert.equal(state.serviceHour, 19);
  assert.equal(state.orders[0].patience, initPatience - 1);
});

test('victory triggered when serving 25+ dishes with $1500+ revenue and 85%+ critique', () => {
  const state = createState(10);
  state.dishesServed = 25;
  state.revenue = 1600;
  state.critique = 90;

  step(state, 'action:wash_dishes');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when operating revenue falls into severe deficit', () => {
  const state = createState(10);
  state.revenue = -250;

  step(state, 'action:wash_dishes');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('defeat triggered when critique collapses to zero', () => {
  const state = createState(10);
  state.critique = 0;

  step(state, 'action:wash_dishes');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws descriptive error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:burn_down_kitchen');
  }, /Illegal action/);
});

test('seed determinism produces identical kitchen simulation', () => {
  const s1 = createState(909);
  const s2 = createState(909);

  step(s1, 'action:prep_produce');
  step(s2, 'action:prep_produce');
  step(s1, 'action:cook_stove');
  step(s2, 'action:cook_stove');

  assert.deepEqual(s1, s2);
});
