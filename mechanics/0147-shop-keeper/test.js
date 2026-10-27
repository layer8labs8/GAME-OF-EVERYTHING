const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  ITEMS,
  SHOP_TIERS,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes Arcane Emporium with initial stock and customers', () => {
  const state = createState(42);
  assert.equal(state.day, 1);
  assert.equal(state.gold, 400);
  assert.equal(state.reputation, 70);
  assert.equal(state.shopTier, 0);
  assert.equal(state.shelves, 4);
  assert.equal(state.stock.potions, 3);
  assert.equal(state.stock.scrolls, 2);
  assert.equal(state.customerQueue.length, 3);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('sell_item transacts customer purchase, earning gold and reputation', () => {
  const state = createState(10);
  // Guarantee front customer wants in-stock item
  state.customerQueue[0] = { id: 'c_test', name: 'Sir Kay', wants: 'potions' };
  state.stock.potions = 2;

  const initGold = state.gold;
  const initRep = state.reputation;

  step(state, 'action:sell_item');

  assert.equal(state.stock.potions, 1);
  assert.equal(state.gold, initGold + ITEMS.potions.price);
  assert.equal(state.reputation, initRep + 2);
  assert.equal(state.customersServed, 1);
});

test('bargain_sale offers discount with elevated reputation bonus', () => {
  const state = createState(10);
  state.customerQueue[0] = { id: 'c_test2', name: 'Lady Rowan', wants: 'scrolls' };
  state.stock.scrolls = 2;

  const initGold = state.gold;
  const initRep = state.reputation;
  const expectedGain = Math.floor(ITEMS.scrolls.price * 0.8);

  step(state, 'action:bargain_sale');

  assert.equal(state.stock.scrolls, 1);
  assert.equal(state.gold, initGold + expectedGain);
  assert.equal(state.reputation, initRep + 6);
});

test('turn_away_customer when stock unavailable removes patron with reputation penalty', () => {
  const state = createState(10);
  state.customerQueue[0] = { id: 'c_test3', name: 'Mage Jester', wants: 'artifacts' };
  state.stock.artifacts = 0;

  const actions = legalActions(state);
  assert.equal(actions.includes('action:turn_away_customer'), true);
  assert.equal(actions.includes('action:sell_item'), false);

  const initRep = state.reputation;
  step(state, 'action:turn_away_customer');
  assert.equal(state.reputation, initRep - 5);
});

test('ordering wholesale stock delivers new merchandise to inventory', () => {
  const state = createState(10);
  state.gold = 500;
  state.stock.potions = 0;

  step(state, 'action:order_potions');
  assert.equal(state.stock.potions, 1);
  assert.equal(state.gold, 500 - ITEMS.potions.cost);
});

test('expand_shelves expands display capacity', () => {
  const state = createState(10);
  state.gold = 500;

  step(state, 'action:expand_shelves');
  assert.equal(state.shelves, 6);
  assert.equal(state.gold, 250);
});

test('renovate_shop elevates store tier and builds reputation', () => {
  const state = createState(10);
  state.gold = 600;

  step(state, 'action:renovate_shop');
  assert.equal(state.shopTier, 1);
  assert.equal(SHOP_TIERS[state.shopTier], 'High Street Shop');
  assert.equal(state.gold, 200);
});

test('close_shop_for_day deducts guild taxes and admits next day customer cohort', () => {
  const state = createState(10);
  const initGold = state.gold;

  step(state, 'action:close_shop_for_day');
  assert.equal(state.day, 2);
  assert.equal(state.gold < initGold, true);
  assert.equal(state.customerQueue.length > 0, true);
});

test('victory triggered when reaching Tier 3 with 4000+ gold and 80%+ reputation', () => {
  const state = createState(10);
  state.shopTier = 3;
  state.gold = 4500;
  state.reputation = 90;
  state.customerQueue = [];

  step(state, 'action:close_shop_for_day');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when falling deeply into merchant debt', () => {
  const state = createState(10);
  state.gold = -350;

  step(state, 'action:close_shop_for_day');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('defeat triggered when reputation collapses to zero', () => {
  const state = createState(10);
  state.reputation = 0;

  step(state, 'action:close_shop_for_day');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws descriptive error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:counterfeit_coins');
  }, /Illegal action/);
});

test('seed determinism produces identical retail scenarios', () => {
  const s1 = createState(616);
  const s2 = createState(616);

  step(s1, 'action:close_shop_for_day');
  step(s2, 'action:close_shop_for_day');
  step(s1, 'action:order_potions');
  step(s2, 'action:order_potions');

  assert.deepEqual(s1, s2);
});
