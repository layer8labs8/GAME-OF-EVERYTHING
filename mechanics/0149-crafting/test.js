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

test('createState initializes Rune & Anvil with baseline materials and gold', () => {
  const state = createState(42);
  assert.equal(state.day, 1);
  assert.equal(state.gold, 350);
  assert.equal(state.forgeLevel, 1);
  assert.equal(state.materials.timber, 6);
  assert.equal(state.materials.ore, 6);
  assert.equal(state.materials.ingots, 2);
  assert.equal(state.materials.gems, 1);
  assert.equal(state.crafted.crowns, 0);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('gather_materials and quarry_gemstones replenish smithing inventory', () => {
  const state = createState(10);
  const initTimber = state.materials.timber;
  const initOre = state.materials.ore;

  step(state, 'action:gather_materials');
  assert.equal(state.materials.timber > initTimber, true);
  assert.equal(state.materials.ore > initOre, true);

  const initGems = state.materials.gems;
  step(state, 'action:quarry_gemstones');
  assert.equal(state.materials.gems > initGems, true);
});

test('smelt_ingot converts raw iron ore into iron ingots', () => {
  const state = createState(10);
  state.materials.ore = 4;
  state.materials.ingots = 0;

  step(state, 'action:smelt_ingot');
  assert.equal(state.materials.ore, 2);
  assert.equal(state.materials.ingots, 1);
});

test('craft_shield forges sturdy shield from timber and ingots', () => {
  const state = createState(10);
  state.materials.timber = 5;
  state.materials.ingots = 4;

  step(state, 'action:craft_shield');
  assert.equal(state.crafted.shields, 1);
  assert.equal(state.materials.timber, 2);
  assert.equal(state.materials.ingots, 2);
});

test('craft_axe forges battleaxe of might', () => {
  const state = createState(10);
  state.materials.timber = 4;
  state.materials.ingots = 6;

  step(state, 'action:craft_axe');
  assert.equal(state.crafted.axes, 1);
  assert.equal(state.materials.timber, 2);
  assert.equal(state.materials.ingots, 2);
});

test('craft_runic_blade enchants martial axe with gems and dust', () => {
  const state = createState(10);
  state.crafted.axes = 1;
  state.materials.gems = 3;
  state.materials.dust = 3;

  step(state, 'action:craft_runic_blade');
  assert.equal(state.crafted.runicBlades, 1);
  assert.equal(state.crafted.axes, 0);
  assert.equal(state.materials.gems, 1);
  assert.equal(state.materials.dust, 1);
});

test('craft_crown synthesizes the Crown of the High Sovereign', () => {
  const state = createState(10);
  state.crafted.runicBlades = 1;
  state.crafted.shields = 1;
  state.materials.gems = 4;
  state.materials.dust = 5;

  step(state, 'action:craft_crown');
  assert.equal(state.crafted.crowns, 1);
  assert.equal(state.crafted.runicBlades, 0);
  assert.equal(state.crafted.shields, 0);
});

test('sell_armaments delivers crafted gear to royal garrison for gold', () => {
  const state = createState(10);
  state.crafted.shields = 2;
  const initGold = state.gold;

  step(state, 'action:sell_armaments');
  assert.equal(state.crafted.shields, 0);
  assert.equal(state.gold, initGold + 180);
  assert.equal(state.itemsDelivered, 2);
});

test('upgrade_forge increases forge tier and gathering yield', () => {
  const state = createState(10);
  state.gold = 500;

  step(state, 'action:upgrade_forge');
  assert.equal(state.forgeLevel, 2);
  assert.equal(state.gold, 250);
});

test('advance_day progresses date and charges forge fuel lease', () => {
  const state = createState(10);
  const initGold = state.gold;

  step(state, 'action:advance_day');
  assert.equal(state.day, 2);
  assert.equal(state.gold < initGold, true);
});

test('victory triggered when crafting crown and attaining 3000+ gold', () => {
  const state = createState(10);
  state.crafted.crowns = 1;
  state.gold = 3200;

  step(state, 'action:advance_day');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when falling deeply into forge debt', () => {
  const state = createState(10);
  state.gold = -350;

  step(state, 'action:advance_day');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws descriptive error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:forge_infinity_gauntlet');
  }, /Illegal action/);
});

test('seed determinism produces identical forging sequences', () => {
  const s1 = createState(333);
  const s2 = createState(333);

  step(s1, 'action:gather_materials');
  step(s2, 'action:gather_materials');
  step(s1, 'action:quarry_gemstones');
  step(s2, 'action:quarry_gemstones');

  assert.deepEqual(s1, s2);
});
