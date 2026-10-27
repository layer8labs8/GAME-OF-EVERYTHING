const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CATEGORIES,
  calculateCategoryScore,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes round 1 with 5 rolled dice and 2 rolls left', () => {
  const s = createState(42);
  assert.equal(s.round, 1);
  assert.equal(s.rollsLeft, 2);
  assert.equal(s.dice.length, 5);
  for (const d of s.dice) {
    assert.ok(d >= 1 && d <= 6);
  }
  assert.equal(s.done, false);
  for (const cat of CATEGORIES) {
    assert.equal(s.scorecard[cat], null);
  }
});

test('toggle_hold flips held status on selected die', () => {
  const s = createState(42);
  assert.equal(s.held[2], false);
  step(s, 'toggle_hold:2');
  assert.equal(s.held[2], true);
  step(s, 'toggle_hold:2');
  assert.equal(s.held[2], false);
});

test('roll updates unheld dice and decrements rollsLeft', () => {
  const s = createState(42);
  step(s, 'toggle_hold:0');
  const heldDieValue = s.dice[0];
  step(s, 'roll');
  assert.equal(s.rollsLeft, 1);
  assert.equal(s.dice[0], heldDieValue, 'Held die must preserve its value');
});

test('rollsLeft reaching 0 disables roll action', () => {
  const s = createState(42);
  step(s, 'roll');
  step(s, 'roll');
  assert.equal(s.rollsLeft, 0);
  const actions = legalActions(s);
  assert.ok(!actions.includes('roll'));
  assert.ok(actions.includes('score:ones'));
});

test('calculateCategoryScore accurately scores classic dice combinations', () => {
  // Yacht (five of a kind)
  assert.equal(calculateCategoryScore('yacht', [5, 5, 5, 5, 5]), 50);
  assert.equal(calculateCategoryScore('yacht', [5, 5, 5, 5, 4]), 0);

  // Full House
  assert.equal(calculateCategoryScore('full_house', [3, 3, 3, 6, 6]), 25);
  assert.equal(calculateCategoryScore('full_house', [3, 3, 3, 3, 6]), 0);

  // Large Straight
  assert.equal(calculateCategoryScore('large_straight', [1, 2, 3, 4, 5]), 40);
  assert.equal(calculateCategoryScore('large_straight', [2, 3, 4, 5, 6]), 40);
  assert.equal(calculateCategoryScore('large_straight', [1, 2, 3, 4, 6]), 0);

  // Small Straight
  assert.equal(calculateCategoryScore('small_straight', [1, 2, 3, 4, 6]), 30);
  assert.equal(calculateCategoryScore('small_straight', [1, 3, 4, 5, 6]), 30);
  assert.equal(calculateCategoryScore('small_straight', [1, 2, 4, 5, 6]), 0);

  // Upper section sums
  assert.equal(calculateCategoryScore('fives', [5, 5, 2, 5, 1]), 15);
  assert.equal(calculateCategoryScore('ones', [1, 1, 1, 1, 1]), 5);
  assert.equal(calculateCategoryScore('sixes', [1, 2, 3, 4, 5]), 0);

  // Three of a kind & Four of a kind
  assert.equal(calculateCategoryScore('three_of_a_kind', [4, 4, 4, 2, 1]), 15);
  assert.equal(calculateCategoryScore('four_of_a_kind', [4, 4, 4, 4, 2]), 18);
  assert.equal(calculateCategoryScore('four_of_a_kind', [4, 4, 4, 2, 1]), 0);

  // Chance
  assert.equal(calculateCategoryScore('chance', [1, 2, 3, 4, 5]), 15);
});

test('scoring advances round and rolls 5 fresh dice', () => {
  const s = createState(42);
  s.dice = [6, 6, 6, 6, 6];
  step(s, 'score:yacht');
  assert.equal(s.scorecard.yacht, 50);
  assert.equal(s.round, 2);
  assert.equal(s.rollsLeft, 2);
  assert.deepEqual(s.held, [false, false, false, false, false]);
  assert.ok(!legalActions(s).includes('score:yacht'), 'Already scored category cannot be scored again');
});

test('upper section total reaching 63 awards 35 bonus points', () => {
  const s = createState(42);
  // Manually fill upper categories with 3 of each: 3 + 6 + 9 + 12 + 15 + 18 = 63
  s.dice = [1, 1, 1, 2, 2];
  step(s, 'score:ones');
  s.dice = [2, 2, 2, 1, 1];
  step(s, 'score:twos');
  s.dice = [3, 3, 3, 1, 1];
  step(s, 'score:threes');
  s.dice = [4, 4, 4, 1, 1];
  step(s, 'score:fours');
  s.dice = [5, 5, 5, 1, 1];
  step(s, 'score:fives');
  assert.equal(s.upperBonusAwarded, false);
  s.dice = [6, 6, 6, 1, 1];
  step(s, 'score:sixes');
  assert.equal(s.upperBonusAwarded, true);
  assert.equal(s.totalScore, 63 + 35);
});

test('filling all 13 categories finishes the game', () => {
  const s = createState(42);
  for (const cat of CATEGORIES) {
    step(s, `score:${cat}`);
  }
  assert.equal(s.done, true);
  assert.equal(isOver(s), true);
  assert.equal(legalActions(s).length, 0);
});

test('illegal action throws without mutating state', () => {
  const s = createState(42);
  step(s, 'score:ones');
  const snap = JSON.stringify(s);
  assert.throws(() => {
    step(s, 'score:ones'); // Already scored!
  }, /Illegal action/);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);
  assert.deepEqual(s1.dice, s2.dice);

  step(s1, 'roll');
  step(s2, 'roll');
  assert.deepEqual(s1.dice, s2.dice);

  step(s1, 'score:chance');
  step(s2, 'score:chance');
  assert.deepEqual(s1.scorecard, s2.scorecard);
  assert.equal(score(s1), score(s2));
});
