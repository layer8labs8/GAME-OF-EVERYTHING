const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TARGET_VP,
  MAX_TURNS,
  CARD_TEMPLATES,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes player with 5 cards in hand and 3 VP', () => {
  const s = createState(42);
  assert.equal(s.turn, 1);
  assert.equal(s.hand.length, 5);
  assert.equal(s.deck.length, 5);
  assert.equal(s.actions, 1);
  assert.equal(s.buys, 1);
  assert.equal(s.coins, 0);
  assert.equal(s.totalVP, 3);
  assert.equal(s.done, false);
  assert.equal(s.won, false);
  assert.ok(s.supply.Province.count > 0);
});

test('playing Copper adds +1 coin', () => {
  const s = createState(42);
  const copper = s.hand.find(c => c.name === 'Copper');
  assert.ok(copper);

  step(s, `play:${copper.id}`);
  assert.equal(s.coins, 1);
  assert.equal(s.playedCards.length, 1);
  assert.ok(!s.hand.some(c => c.id === copper.id));
});

test('playing Village grants +1 card and +2 actions', () => {
  const s = createState(42);
  // Inject Village into hand
  s.hand.push({
    id: 'Village_99',
    name: 'Village',
    type: 'action',
    cost: 3,
    cards: 1,
    actions: 2,
    buys: 0,
    coins: 0,
    vp: 0
  });

  const initialHandLen = s.hand.length;
  step(s, 'play:Village_99');

  // Village used 1 action and gave 2 -> net actions: 1 - 1 + 2 = 2
  assert.equal(s.actions, 2);
  // Hand should have drawn 1 card (net length same: -1 played + 1 drawn)
  assert.equal(s.hand.length, initialHandLen);
});

test('buying card deducts coins and places in discard', () => {
  const s = createState(42);
  s.coins = 5;
  s.buys = 1;

  assert.ok(legalActions(s).includes('buy:Duchy'));
  step(s, 'buy:Duchy');

  assert.equal(s.coins, 0);
  assert.equal(s.buys, 0);
  assert.ok(s.discard.some(c => c.name === 'Duchy'));
  assert.equal(s.totalVP, 6); // 3 starting + 3 from Duchy
});

test('endTurn cleans up, draws fresh 5 cards and resets resources', () => {
  const s = createState(42);
  // Play all Coppers in hand
  for (const c of [...s.hand]) {
    if (c.name === 'Copper') step(s, `play:${c.id}`);
  }

  step(s, 'endTurn');
  assert.equal(s.turn, 2);
  assert.equal(s.actions, 1);
  assert.equal(s.buys, 1);
  assert.equal(s.coins, 0);
  assert.equal(s.hand.length, 5);
  assert.equal(s.playedCards.length, 0);
});

test('deck reshuffles when draw cards runs out', () => {
  const s = createState(42);
  // Empty draw deck to 0
  s.discard = [...s.deck];
  s.deck = [];

  step(s, 'endTurn');
  // Drawing 5 should have triggered reshuffle of discard
  assert.equal(s.hand.length, 5);
  assert.ok(s.deck.length > 0 || s.discard.length >= 0);
});

test('illegal action throws error', () => {
  const s = createState(42);
  assert.throws(() => {
    step(s, 'buy:Province'); // Costs 8 coins, player has 0
  }, /Illegal action/);
});

test('reaching 32 VP or 4 Provinces achieves Victory', () => {
  const s = createState(100);
  s.coins = 32;
  s.buys = 4;

  step(s, 'buy:Province');
  step(s, 'buy:Province');
  step(s, 'buy:Province');
  step(s, 'buy:Province');

  assert.equal(s.provincesOwned, 4);
  assert.equal(s.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) > 1000);
});

test('exceeding max turns ends match in defeat', () => {
  const s = createState(555);
  s.turn = MAX_TURNS;
  step(s, 'endTurn');

  assert.equal(s.done, true);
  assert.equal(s.won, false);
  assert.ok(isOver(s));
});

test('state is deterministic across same seed', () => {
  const s1 = createState(777);
  const s2 = createState(777);
  assert.deepEqual(s1, s2);

  const act = legalActions(s1)[0];
  step(s1, act);
  step(s2, act);
  assert.deepEqual(s1, s2);
});
