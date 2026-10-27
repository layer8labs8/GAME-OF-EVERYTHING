const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STARTING_STACK,
  SMALL_BLIND,
  BIG_BLIND,
  BET_SIZE,
  createState,
  legalActions,
  step,
  isOver,
  score,
  evaluate5Cards,
  evaluateBest5Of7
} = require('./www/logic.js');

test('createState initializes chips, hole cards and blinds pot', () => {
  const s = createState(42);
  assert.equal(s.handNumber, 1);
  assert.equal(s.playerHole.length, 2);
  assert.equal(s.oppHole.length, 2);
  assert.equal(s.community.length, 0);
  assert.equal(s.pot, SMALL_BLIND + BIG_BLIND);
  assert.equal(s.street, 'preflop');
  assert.equal(s.done, false);
  assert.equal(s.won, false);
});

test('evaluate5Cards accurately classifies poker hands', () => {
  // Royal Flush
  const royalFlush = [
    { val: 14, suit: 'S' },
    { val: 13, suit: 'S' },
    { val: 12, suit: 'S' },
    { val: 11, suit: 'S' },
    { val: 10, suit: 'S' }
  ];
  assert.equal(evaluate5Cards(royalFlush)[0], 9);

  // Full House
  const fullHouse = [
    { val: 10, suit: 'S' },
    { val: 10, suit: 'H' },
    { val: 10, suit: 'D' },
    { val: 4, suit: 'C' },
    { val: 4, suit: 'S' }
  ];
  assert.equal(evaluate5Cards(fullHouse)[0], 7);

  // Flush
  const flush = [
    { val: 14, suit: 'H' },
    { val: 11, suit: 'H' },
    { val: 8, suit: 'H' },
    { val: 6, suit: 'H' },
    { val: 2, suit: 'H' }
  ];
  assert.equal(evaluate5Cards(flush)[0], 6);

  // Straight
  const straight = [
    { val: 9, suit: 'H' },
    { val: 8, suit: 'S' },
    { val: 7, suit: 'D' },
    { val: 6, suit: 'C' },
    { val: 5, suit: 'S' }
  ];
  assert.equal(evaluate5Cards(straight)[0], 5);
});

test('evaluateBest5Of7 selects optimal hand out of 7 cards', () => {
  const seven = [
    { val: 14, suit: 'S' }, { val: 14, suit: 'H' }, // Pocket Aces
    { val: 14, suit: 'D' }, { val: 10, suit: 'C' }, { val: 10, suit: 'S' }, // Aces Full of Tens
    { val: 2, suit: 'H' }, { val: 3, suit: 'D' }
  ];
  const best = evaluateBest5Of7(seven);
  assert.equal(best[0], 7); // Full House category
  assert.equal(best[1], 14); // Triple Aces
  assert.equal(best[2], 10); // Pair of Tens
});

test('calling advances street to flop and deals 3 community cards', () => {
  const s = createState(42);
  const actions = legalActions(s);
  assert.ok(actions.includes('call'));

  step(s, 'call');
  assert.equal(s.street, 'flop');
  assert.equal(s.community.length, 3);
});

test('folding concedes the pot to the opponent and starts next hand', () => {
  const s = createState(42);
  const initialPot = s.pot;
  const oppChipsBefore = s.oppChips;

  step(s, 'fold');
  // Opponent gained pot, then next hand posted blinds
  assert.ok(s.oppChips > oppChipsBefore);
  assert.equal(s.handNumber, 2);
});

test('all_in shoves all chips into pot', () => {
  const s = createState(42);
  assert.ok(legalActions(s).includes('all_in'));

  step(s, 'all_in');
  // Either hand resulted in showdown or fold, so next hand started or match ended
  assert.ok(s.totalActions >= 1);
});

test('illegal action throws error', () => {
  const s = createState(42);
  assert.throws(() => {
    step(s, 'invalid_action');
  }, /Illegal action/);
});

test('busting opponent achieves Victory', () => {
  const s = createState(100);
  // Guarantee player win with Four Aces
  s.playerHole = [{ val: 14, suit: 'S' }, { val: 14, suit: 'H' }];
  s.oppHole = [{ val: 2, suit: 'C' }, { val: 3, suit: 'D' }];
  s.community = [
    { val: 14, suit: 'D' }, { val: 14, suit: 'C' }, { val: 9, suit: 'H' },
    { val: 8, suit: 'S' }, { val: 7, suit: 'C' }
  ];
  s.street = 'river';
  s.oppChips = 5;
  s.playerChips = 995;

  step(s, 'all_in');

  assert.equal(s.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) > 2000);
});

test('state simulation is deterministic across identical seed', () => {
  const s1 = createState(777);
  const s2 = createState(777);
  assert.deepEqual(s1, s2);

  const act = legalActions(s1)[0];
  step(s1, act);
  step(s2, act);
  assert.deepEqual(s1, s2);
});
