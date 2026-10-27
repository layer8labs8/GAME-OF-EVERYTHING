const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  TOTAL_ROUNDS,
  MAX_STRIKES
} = require('./www/logic.js');

test('createState initializes 10 rounds, lifelines, score 0 and strikes 0', () => {
  const state = createState(42);
  assert.equal(state.totalRounds, TOTAL_ROUNDS);
  assert.equal(state.questions.length, TOTAL_ROUNDS);
  assert.equal(state.round, 0);
  assert.equal(state.strikes, 0);
  assert.equal(state.score, 0);
  assert.equal(state.streak, 0);
  assert.equal(state.lifelines.fiftyFifty, 1);
  assert.equal(state.lifelines.doubleDown, 1);
  assert.equal(state.lifelines.skip, 1);
  assert.equal(state.done, false);
});

test('answering correctly awards points, advances round and increments streak', () => {
  const state = createState(42);
  const correctIdx = state.questions[0].correctIndex;

  const res = step(state, `answer:${correctIdx}`);
  assert.equal(state.round, 1);
  assert.equal(state.strikes, 0);
  assert.equal(state.correctCount, 1);
  assert.equal(state.streak, 1);
  assert.ok(state.score >= 100);
  assert.ok(res.reward >= 100);
});

test('answering incorrectly incurs strike and resets streak', () => {
  const state = createState(42);
  state.streak = 2;
  const wrongIdx = (state.questions[0].correctIndex + 1) % 4;

  const res = step(state, `answer:${wrongIdx}`);
  assert.equal(state.round, 1);
  assert.equal(state.strikes, 1);
  assert.equal(state.streak, 0);
  assert.ok(res.reward < 0);
});

test('fifty_fifty lifeline eliminates two wrong choices', () => {
  const state = createState(42);
  const correctIdx = state.questions[0].correctIndex;

  step(state, 'use_lifeline:fifty_fifty');
  assert.equal(state.lifelines.fiftyFifty, 0);
  assert.equal(state.eliminated.length, 2);
  assert.ok(!state.eliminated.includes(correctIdx));

  const actions = legalActions(state);
  assert.ok(actions.includes(`answer:${correctIdx}`));
  assert.equal(actions.filter(a => a.startsWith('answer:')).length, 2);
});

test('double_down lifeline doubles points on correct answer', () => {
  const state = createState(42);
  const correctIdx = state.questions[0].correctIndex;

  step(state, 'use_lifeline:double_down');
  assert.equal(state.doubleDownActive, true);

  step(state, `answer:${correctIdx}`);
  assert.equal(state.score, 200); // 100 * 2
  assert.equal(state.doubleDownActive, false);
});

test('skip lifeline advances round without strike penalty', () => {
  const state = createState(42);
  const initialStrikes = state.strikes;

  step(state, 'use_lifeline:skip');
  assert.equal(state.lifelines.skip, 0);
  assert.equal(state.round, 1);
  assert.equal(state.strikes, initialStrikes);
});

test('accumulating 3 strikes triggers defeat', () => {
  const state = createState(42);
  for (let i = 0; i < MAX_STRIKES; i++) {
    const wrongIdx = (state.questions[state.round].correctIndex + 1) % 4;
    step(state, `answer:${wrongIdx}`);
  }

  assert.equal(state.strikes, MAX_STRIKES);
  assert.equal(state.lost, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
});

test('completing all 10 questions with fewer than 3 strikes achieves victory', () => {
  const state = createState(42);
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const correctIdx = state.questions[state.round].correctIndex;
    step(state, `answer:${correctIdx}`);
  }

  assert.equal(state.round, TOTAL_ROUNDS);
  assert.equal(state.won, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.ok(score(state) > 1000);
});

test('illegal action throws without mutating state', () => {
  const state = createState(42);
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'answer:9'); // invalid option
  });

  assert.equal(JSON.stringify(state), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['use_lifeline:fifty_fifty', 'use_lifeline:double_down'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
