const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

// Helper to create a state with a known grid (using the fixed layout from examples)
function createFixedState(seed = 1) {
  const s = L.createState(seed);
  // Overwrite grid with the fixed symbol layout from the spec examples
  const symbols = [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7];
  s.grid = symbols.map((sym, idx) => ({ symbol: sym, faceUp: false, matched: false }));
  s.turnsLeft = 20;
  s.firstFlip = null;
  s.stepCount = 0;
  // rng can stay as is
  return s;
}

test('createState returns valid initial state', () => {
  const s = L.createState(42);
  assert.equal(s.grid.length, 16);
  assert.equal(s.turnsLeft, 20);
  assert.equal(s.firstFlip, null);
  assert.equal(s.stepCount, 0);
  assert.ok(Number.isInteger(s.rng));
  // All cards face down, not matched
  for (const c of s.grid) {
    assert.equal(c.faceUp, false);
    assert.equal(c.matched, false);
    assert.ok(c.symbol >= 0 && c.symbol <= 7);
  }
  // Exactly two of each symbol
  const counts = {};
  for (const c of s.grid) counts[c.symbol] = (counts[c.symbol] || 0) + 1;
  for (let v = 0; v < 8; v++) assert.equal(counts[v], 2);
});

test('legalActions initially returns all indices', () => {
  const s = createFixedState();
  const acts = L.legalActions(s);
  assert.deepEqual(acts, [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
});

test('Example 1: first flip', () => {
  const s = createFixedState();
  s.stepCount = 5;
  const { reward, done } = L.step(s, 0);
  assert.equal(reward, 0);
  assert.equal(done, false);
  assert.equal(s.grid[0].faceUp, true);
  assert.equal(s.grid[0].matched, false);
  assert.equal(s.firstFlip, 0);
  assert.equal(s.stepCount, 6);
  assert.equal(s.turnsLeft, 20);
});

test('Example 2: second flip matches', () => {
  const s = createFixedState();
  s.stepCount = 6;
  s.firstFlip = 0;
  s.grid[0].faceUp = true; // symbol 0
  // card 1 is symbol 0, face down
  const { reward, done } = L.step(s, 1);
  assert.equal(reward, 10);
  assert.equal(done, false);
  assert.equal(s.grid[0].matched, true);
  assert.equal(s.grid[1].matched, true);
  assert.equal(s.grid[0].faceUp, true);
  assert.equal(s.grid[1].faceUp, true);
  assert.equal(s.firstFlip, null);
  assert.equal(s.turnsLeft, 19);
  assert.equal(s.stepCount, 7);
});

test('Example 3: second flip mismatches', () => {
  const s = createFixedState();
  s.stepCount = 6;
  s.firstFlip = 0; // symbol 0
  s.grid[0].faceUp = true;
  // card 2 is symbol 1
  const { reward, done } = L.step(s, 2);
  assert.equal(reward, -1);
  assert.equal(done, false);
  assert.equal(s.grid[0].faceUp, false);
  assert.equal(s.grid[2].faceUp, false);
  assert.equal(s.grid[0].matched, false);
  assert.equal(s.grid[2].matched, false);
  assert.equal(s.firstFlip, null);
  assert.equal(s.turnsLeft, 19);
  assert.equal(s.stepCount, 7);
});

test('Example 4: winning move (last pair)', () => {
  const s = createFixedState();
  s.turnsLeft = 5;
  s.stepCount = 30;
  s.firstFlip = 14; // symbol 7
  s.grid[14].faceUp = true;
  // set all other cards matched
  for (let i = 0; i < 14; i++) {
    s.grid[i].matched = true;
    s.grid[i].faceUp = true;
  }
  // card 15 is symbol 7, face down
  const { reward, done } = L.step(s, 15);
  assert.equal(reward, 60); // 10 + 50 bonus
  assert.equal(done, true);
  assert.equal(s.grid[14].matched, true);
  assert.equal(s.grid[15].matched, true);
  assert.equal(s.firstFlip, null);
  assert.equal(s.turnsLeft, 4);
  assert.equal(s.stepCount, 31);
});

test('Example 5: turns run out on mismatch', () => {
  const s = createFixedState();
  s.turnsLeft = 1;
  s.stepCount = 38;
  s.firstFlip = 4; // symbol 2
  s.grid[4].faceUp = true;
  // card 6 is symbol 3
  const { reward, done } = L.step(s, 6);
  assert.equal(reward, -1);
  assert.equal(done, true);
  assert.equal(s.grid[4].faceUp, false);
  assert.equal(s.grid[6].faceUp, false);
  assert.equal(s.firstFlip, null);
  assert.equal(s.turnsLeft, 0);
  assert.equal(s.stepCount, 39);
});

test('Example 6: step limit reached on first flip', () => {
  const s = createFixedState();
  s.turnsLeft = 10;
  s.stepCount = 399;
  s.firstFlip = null;
  const { reward, done } = L.step(s, 7);
  assert.equal(reward, 0);
  assert.equal(done, true); // forced end at 400 steps
  assert.equal(s.stepCount, 400);
  assert.equal(s.firstFlip, 7);
  assert.equal(s.grid[7].faceUp, true);
});

test('Example 6 variant: step limit reached on second flip (match)', () => {
  const s = createFixedState();
  s.turnsLeft = 10;
  s.stepCount = 399;
  s.firstFlip = 8; // symbol 4
  s.grid[8].faceUp = true;
  // card 9 is also symbol 4
  const { reward, done } = L.step(s, 9);
  assert.equal(reward, 10); // match reward, no win bonus because not all matched
  assert.equal(done, true); // forced end
  assert.equal(s.stepCount, 400);
  assert.equal(s.firstFlip, null);
  assert.equal(s.turnsLeft, 9);
  assert.equal(s.grid[8].matched, true);
  assert.equal(s.grid[9].matched, true);
});

test('score function matches specification', () => {
  const s = createFixedState();
  // no matches
  assert.equal(L.score(s), 0);
  // match one pair
  s.grid[0].matched = s.grid[1].matched = true;
  assert.equal(L.score(s), 10);
  // match all pairs
  for (let i = 0; i < 16; i++) s.grid[i].matched = true;
  assert.equal(L.score(s), 8*10 + 50); // 130
});

test('isOver returns true only when game ended', () => {
  const s = createFixedState();
  assert.equal(L.isOver(s), false);
  // win
  for (let i = 0; i < 16; i++) s.grid[i].matched = true;
  assert.equal(L.isOver(s), true);
  // lose by turns
  const s2 = createFixedState();
  s2.turnsLeft = 0;
  assert.equal(L.isOver(s2), true);
  // forced step limit
  const s3 = createFixedState();
  s3.stepCount = 400;
  assert.equal(L.isOver(s3), true);
});

test('step throws on illegal action', () => {
  const s = createFixedState();
  // flip a card, then try to flip it again
  L.step(s, 0);
  assert.throws(() => L.step(s, 0), /illegal/i);
  // flip a matched card
  const s2 = createFixedState();
  s2.grid[0].matched = true;
  assert.throws(() => L.step(s2, 0), /illegal/i);
  // flip a face-up unmatched card (firstFlip already set)
  const s3 = createFixedState();
  L.step(s3, 0); // firstFlip = 0
  assert.throws(() => L.step(s3, 0), /illegal/i);
});

test('legalActions respects firstFlip and matched/faceUp', () => {
  const s = createFixedState();
  L.step(s, 0); // firstFlip = 0
  const acts = L.legalActions(s);
  assert.ok(!acts.includes(0));
  assert.ok(acts.includes(1));
  // after mismatch, both face down again
  L.step(s, 2); // mismatch, firstFlip reset
  const acts2 = L.legalActions(s);
  assert.ok(acts2.includes(0));
  assert.ok(acts2.includes(2));
  // matched cards excluded
  s.grid[0].matched = true;
  const acts3 = L.legalActions(s);
  assert.ok(!acts3.includes(0));
});
