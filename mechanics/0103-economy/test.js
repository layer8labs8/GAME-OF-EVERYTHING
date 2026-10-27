const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  COMMODITY_BASE_PRICES,
  FACILITY_SPECS
} = require('./www/logic.js');

test('createState initializes treasury, facilities, initial inventory, and prices', () => {
  const s = createState(42);
  assert.strictEqual(s.quarter, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.cash, 600);
  assert.strictEqual(s.debt, 0);
  assert.strictEqual(s.facilities.coal_mine.count, 1);
  assert.strictEqual(s.facilities.grain_farm.count, 1);
  assert.strictEqual(s.inventory.coal, 10);
  assert.strictEqual(s.prices.coal, COMMODITY_BASE_PRICES.coal);
});

test('legalActions lists construction, sales, debt, and next quarter', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('next_quarter'));
  assert.ok(actions.includes('build:iron_mine'));
  assert.ok(actions.includes('sell:coal:10'));
  assert.ok(actions.includes('take_loan'));
});

test('build facility deducts capital and increases facility capacity', () => {
  const s = createState(202);
  const initCash = s.cash;

  step(s, 'build:iron_mine');

  assert.strictEqual(s.facilities.iron_mine.count, 1);
  assert.strictEqual(s.cash, initCash - FACILITY_SPECS.iron_mine.cost);
});

test('selling commodities liquidates inventory for cash revenue', () => {
  const s = createState(303);
  const initCash = s.cash;
  const initCoal = s.inventory.coal;
  const unitPrice = s.prices.coal;

  step(s, 'sell:coal:10');

  assert.strictEqual(s.inventory.coal, initCoal - 10);
  assert.strictEqual(s.cash, initCash + 10 * unitPrice);
});

test('processing steel converts raw coal and iron into steel ingots', () => {
  const s = createState(404);
  s.facilities.steel_mill.count = 1;
  s.inventory.coal = 10;
  s.inventory.iron = 10;

  step(s, 'process:steel_mill');

  assert.strictEqual(s.inventory.coal, 5);
  assert.strictEqual(s.inventory.iron, 5);
  assert.strictEqual(s.inventory.steel, 8);
});

test('advancing quarter extracts raw materials and updates market prices', () => {
  const s = createState(505);
  const coalBefore = s.inventory.coal;

  step(s, 'next_quarter');

  assert.strictEqual(s.quarter, 2);
  assert.ok(s.inventory.coal > coalBefore);
  assert.ok(s.prices.coal > 0);
});

test('taking loan adds liquidity but incurs debt obligation', () => {
  const s = createState(606);
  assert.strictEqual(s.debt, 0);

  step(s, 'take_loan');

  assert.strictEqual(s.debt, 500);
  assert.strictEqual(s.cash, 1100);
});

test('achieving industrial hegemony wins the game', () => {
  const s = createState(707);
  s.cash = 6000;
  s.facilities.tech_lab.count = 1;
  s.debt = 0;

  step(s, 'next_quarter');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.strictEqual(s.result, 'industrial_hegemony');
  assert.ok(score(s) > 1000);
});

test('illegal action throws error without state mutation', () => {
  const s = createState(808);
  s.cash = 10; // Insufficient cash to build steel mill (300)
  const jsonBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'build:steel_mill');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), jsonBefore);
});

test('same seed and sequence of financial moves yields deterministic state', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  for (let i = 0; i < 5; i++) {
    const legals = legalActions(s1);
    const act = legals[0];
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
