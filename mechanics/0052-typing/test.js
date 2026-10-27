const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  TOTAL_WORDS,
  INITIAL_HP,
  INITIAL_EMP
} = require('./www/logic.js');

test('createState initializes hp, emp charges, word counters and empty active ciphers', () => {
  const state = createState(123);
  assert.equal(state.hp, INITIAL_HP);
  assert.equal(state.empCharges, INITIAL_EMP);
  assert.equal(state.wordsDestroyed, 0);
  assert.equal(state.totalWords, TOTAL_WORDS);
  assert.equal(state.ciphers.length, 0);
  assert.equal(state.done, false);
});

test('wait steps time and spawns a cipher on turn 0', () => {
  const state = createState(123);
  const res = step(state, 'wait');
  assert.equal(state.turn, 1);
  assert.equal(state.ciphers.length, 1);
  assert.ok(state.ciphers[0].word.length > 0);
  assert.equal(state.ciphers[0].typed, '');
});

test('typing first letter of incoming cipher locks onto it', () => {
  const state = createState(123);
  step(state, 'wait'); // Spawns cipher 0

  const target = state.ciphers[0];
  const firstLetter = target.word[0];
  assert.equal(state.currentTargetId, null);

  const res = step(state, `type:${firstLetter}`);
  if (target.word.length > 1) {
    assert.equal(state.currentTargetId, target.id);
    assert.equal(target.typed, firstLetter);
  }
  assert.ok(res.reward > 0);
});

test('typing complete word destroys cipher and increases score and combo', () => {
  const state = createState(123);
  step(state, 'wait'); // Spawns cipher 0
  const target = state.ciphers[0];
  const word = target.word;

  for (let i = 0; i < word.length; i++) {
    step(state, `type:${word[i]}`);
  }

  assert.equal(state.wordsDestroyed, 1);
  assert.equal(state.combo, 1);
  assert.equal(state.currentTargetId, null);
  assert.ok(score(state) > 0);
});

test('emp burst destroys all active ciphers and consumes charge', () => {
  const state = createState(123);
  step(state, 'wait'); // cipher 1 spawns
  assert.equal(state.ciphers.length, 1);

  const initialEmp = state.empCharges;
  const res = step(state, 'emp_burst');

  assert.equal(state.empCharges, initialEmp - 1);
  assert.equal(state.ciphers.length, 0);
  assert.equal(state.wordsDestroyed, 1);
  assert.ok(res.reward > 0);
});

test('cipher reaching y >= 100 breaches firewall and deducts hp', () => {
  const state = createState(123);
  step(state, 'wait');
  const target = state.ciphers[0];
  target.y = 98; // Will cross 100 on next tick

  const initialHp = state.hp;
  step(state, 'wait');
  assert.equal(state.hp, initialHp - 1);
});

test('depleting all hp triggers defeat', () => {
  const state = createState(123);
  state.hp = 1;
  step(state, 'wait');
  state.ciphers[0].y = 99;

  step(state, 'wait');
  assert.equal(state.hp, 0);
  assert.equal(state.lost, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
});

test('destroying all required words achieves victory', () => {
  const state = createState(123);
  state.wordsDestroyed = TOTAL_WORDS;

  step(state, 'wait');
  assert.equal(state.won, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(123);
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'type:9'); // invalid character
  });

  assert.equal(JSON.stringify(state), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['wait', 'wait', 'wait'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
