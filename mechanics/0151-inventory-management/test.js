const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  calculateLoadoutPower,
  getTotalWeight,
  ITEM_DEFS,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes Grid Hauler with 4x4 grid and starting loadout', () => {
  const state = createState(42);
  assert.equal(state.chamber, 1);
  assert.equal(state.gold, 300);
  assert.equal(state.adventurerHp, 100);
  assert.equal(state.gridRows, 4);
  assert.equal(state.gridCols, 4);
  assert.equal(state.maxWeight, 18);
  assert.equal(state.items.length, 3);
  assert.equal(state.chambersCleared, 0);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('calculateLoadoutPower accurately sums attack and defense with mana synergy', () => {
  const state = createState(10);
  // dagger: 12 atk, shield: 18 def, rations: 2 atk + 2 def = 14 atk + 20 def = 34 power
  const initial = calculateLoadoutPower(state);
  assert.equal(initial.power, 34);

  // Add mana shard -> adds 6 atk, 2 def + 8 synergy bonus = +16 power
  state.items.push({ id: 'mana_1', type: 'mana', row: 3, col: 3, w: 1, h: 1, weight: 1, atk: 6, def: 2 });
  const boosted = calculateLoadoutPower(state);
  assert.equal(boosted.power, 50);
});

test('packing items fits them into the grid and deducts costs', () => {
  const state = createState(10);
  state.gold = 500;
  const initCount = state.items.length;
  const initWeight = getTotalWeight(state);

  step(state, 'action:pack_potion');
  assert.equal(state.items.length, initCount + 1);
  assert.equal(getTotalWeight(state), initWeight + 1);
  assert.equal(state.gold, 500 - ITEM_DEFS.potion.cost);
});

test('expand_grid increases spatial grid dimensions', () => {
  const state = createState(10);
  state.gold = 500;

  step(state, 'action:expand_grid');
  assert.equal(state.gridCols, 5);
  assert.equal(state.gold, 300);
});

test('upgrade_straps increases maximum carry weight limit', () => {
  const state = createState(10);
  state.gold = 500;

  step(state, 'action:upgrade_straps');
  assert.equal(state.maxWeight, 22);
  assert.equal(state.gold, 350);
});

test('delve_encounter resolves chamber combat and awards bounty upon victory', () => {
  const state = createState(10);
  // Ensure strong stats for chamber 1 (threat 25)
  state.items.push({ id: 'boost_1', type: 'shield', row: 2, col: 1, w: 2, h: 2, weight: 4, atk: 10, def: 20 });
  const initGold = state.gold;

  step(state, 'action:delve_encounter');
  assert.equal(state.chamber, 2);
  assert.equal(state.chambersCleared, 1);
  assert.equal(state.gold > initGold, true);
});

test('victory triggered when 8 chambers cleared with 2000+ gold', () => {
  const state = createState(10);
  state.chambersCleared = 8;
  state.gold = 2200;

  step(state, 'action:upgrade_straps');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when adventurer health drops to zero', () => {
  const state = createState(10);
  state.adventurerHp = 2;
  state.items = []; // naked explorer vs monster
  state.chamber = 5;

  step(state, 'action:delve_encounter');
  assert.equal(state.adventurerHp, 0);
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws descriptive error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:pack_dragon_egg');
  }, /Illegal action/);
});

test('seed determinism produces identical inventory trajectories', () => {
  const s1 = createState(808);
  const s2 = createState(808);

  step(s1, 'action:pack_potion');
  step(s2, 'action:pack_potion');
  step(s1, 'action:upgrade_straps');
  step(s2, 'action:upgrade_straps');

  assert.deepEqual(s1, s2);
});
