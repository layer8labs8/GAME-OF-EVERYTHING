const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  isPangram,
  calculateWordScore,
  getRank,
  TARGET_SCORE,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes center letter, 6 outer letters, validWords and score 0', () => {
  const state = createState(42);
  assert.equal(typeof state.centerLetter, 'string');
  assert.equal(state.centerLetter.length, 1);
  assert.equal(state.outerLetters.length, 6);
  assert.equal(state.allLetters.length, 7);
  assert.ok(state.validWords.length >= 10);
  assert.equal(state.score, 0);
  assert.equal(state.turnsLeft, MAX_TURNS);
  assert.equal(state.done, false);
});

test('add_letter, delete_letter and clear update currentInput', () => {
  const state = createState(42);
  step(state, `add_letter:${state.centerLetter}`);
  step(state, `add_letter:${state.outerLetters[0]}`);
  assert.equal(state.currentInput, state.centerLetter + state.outerLetters[0]);

  step(state, 'delete_letter');
  assert.equal(state.currentInput, state.centerLetter);

  step(state, 'clear');
  assert.equal(state.currentInput, '');
});

test('shuffle permutes the 6 outer letters without altering the set', () => {
  const state = createState(42);
  const oldSet = new Set(state.outerLetters);

  step(state, 'shuffle');
  const newSet = new Set(state.outerLetters);
  assert.deepEqual(oldSet, newSet);
  assert.equal(state.outerLetters.length, 6);
});

test('submitting a valid word scores points and stores in foundWords', () => {
  const state = createState(42);
  const word = state.validWords[0];
  const initialTurns = state.turnsLeft;

  const res = step(state, `submit_word:${word}`);
  assert.ok(state.foundWords.includes(word));
  assert.ok(state.score > 0);
  assert.equal(state.turnsLeft, initialTurns - 1);
  assert.ok(res.reward > 0);
});

test('submitting duplicate word fails and penalizes turn', () => {
  const state = createState(42);
  const word = state.validWords[0];
  step(state, `submit_word:${word}`);

  // Try again via manual input
  state.currentInput = word;
  const res = step(state, 'submit');
  assert.equal(state.lastResult.success, false);
  assert.equal(state.lastResult.message, 'Already found');
  assert.ok(res.reward < 0);
});

test('pangram calculation detects all 7 unique letters and awards bonus', () => {
  const letters = ['C', 'O', 'M', 'P', 'A', 'T', 'I'];
  assert.equal(isPangram('COMPACT', letters), false); // Missing I
  const pangramWord = 'COMPACTI'; // Hypothetical pangram test
  assert.equal(isPangram(pangramWord, letters), true);

  const basePoints = calculateWordScore('PACT', letters);
  assert.equal(basePoints, 1); // 4 letters = 1 pt
});

test('reaching targetScore achieves victory and Archmage rank', () => {
  const state = createState(42);
  state.score = TARGET_SCORE;

  step(state, 'shuffle');
  assert.equal(state.won, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(getRank(state.score), 'Archmage');
});

test('running out of turns triggers defeat', () => {
  const state = createState(42);
  state.turnsLeft = 1;

  step(state, `submit_word:${state.validWords[0]}`);
  assert.equal(state.turnsLeft, 0);
  assert.equal(state.done, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(42);
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'add_letter:XYZ'); // illegal letter
  });

  assert.equal(JSON.stringify(state), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const actions = ['shuffle', 'shuffle', `add_letter:${s1.centerLetter}`];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
