const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  PORTS,
  COMMODITIES,
  SHIP_TIERS
} = require('./www/logic.js');

test('createState initializes Venice port, 300 gold, Sloop flagship, and commodity markets', () => {
  const s = createState(42);
  assert.strictEqual(s.voyage, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.port, 'venice');
  assert.strictEqual(s.gold, 300);
  assert.strictEqual(s.shipTier, 1);
  assert.strictEqual(s.cargoCap, 20);
  assert.strictEqual(s.hp, 60);
  assert.strictEqual(s.cannons, 1);
  assert.strictEqual(s.warehouses.length, 0);
});

test('legalActions lists commodity purchases in current port and sailing routes', () => {
  const s = createState(101);
  const actions = legalActions(s);

  // In Venice, Wine and Grain are affordable
  assert.ok(actions.includes('buy:wine:5') || actions.includes('buy:grain:5'));
  // Connected routes from Venice are Genoa, Ragusa, Constantinople
  assert.ok(actions.includes('sail:genoa'));
  assert.ok(actions.includes('sail:ragusa'));
});

test('purchasing commodities deducts gold and loads cargo hold', () => {
  const s = createState(202);
  const initGold = s.gold;
  const winePrice = s.prices.venice.wine;

  step(s, 'buy:wine:10');

  assert.strictEqual(s.cargo.wine, 10);
  assert.strictEqual(s.gold, initGold - 10 * winePrice);
});

test('sailing across sea routes updates port, advances voyage, and triggers market shifts', () => {
  const s = createState(303);
  assert.strictEqual(s.port, 'venice');

  step(s, 'sail:ragusa');

  assert.strictEqual(s.port, 'ragusa');
  assert.strictEqual(s.voyage, 2);
  assert.ok(s.prices.ragusa.grain > 0);
});

test('selling cargo in high-demand port yields substantial arbitrage revenue', () => {
  const s = createState(404);
  s.port = 'ragusa';
  s.cargo.grain = 10;
  const initGold = s.gold;
  const unitPrice = s.prices.ragusa.grain;

  step(s, 'sell:grain:10');

  assert.strictEqual(s.cargo.grain, 0);
  assert.strictEqual(s.gold, initGold + 10 * unitPrice);
});

test('upgrade_ship commissions Trade Caravel with increased capacity and cannons', () => {
  const s = createState(505);
  s.gold = 500;

  step(s, 'upgrade_ship');

  assert.strictEqual(s.shipTier, 2);
  assert.strictEqual(s.cargoCap, SHIP_TIERS[1].cargo);
  assert.strictEqual(s.cannons, 2);
});

test('hiring escort protects merchant convoy from pirate raids', () => {
  const s = createState(606);
  assert.strictEqual(s.escorts, 0);

  step(s, 'hire_escort');

  assert.strictEqual(s.escorts, 1);
  assert.strictEqual(s.gold, 300 - 80);
});

test('building guild warehouse provides permanent local trade discount', () => {
  const s = createState(707);
  s.gold = 500;

  step(s, 'build_warehouse:venice');

  assert.ok(s.warehouses.includes('venice'));
  assert.strictEqual(s.gold, 150);
});

test('achieving merchant magnate status wins the game', () => {
  const s = createState(808);
  s.gold = 4500;
  s.shipTier = 3;
  s.warehouses = ['venice', 'ragusa'];

  step(s, 'sail:genoa');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.strictEqual(s.result, 'merchant_magnate');
  assert.ok(score(s) > 1000);
});

test('illegal action throws error without state mutation', () => {
  const s = createState(909);
  s.gold = 5;
  const jsonBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'buy:spices:10'); // Unaffordable
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), jsonBefore);
});

test('same seed and sequence of voyages yields deterministic simulation', () => {
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
