const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  MAX_DAYS,
  HEROINES
} = require('./www/logic.js');

test('createState initializes student on Day 1 with baseline stats', () => {
  const state = createState(42);
  assert.equal(state.day, 1);
  assert.equal(state.intellect, 10);
  assert.equal(state.athletics, 10);
  assert.equal(state.charm, 10);
  assert.equal(state.stress, 0);
  assert.equal(state.affection.aria, 0);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('activity:study boosts intellect and increases stress', () => {
  const state = createState(10);
  const initIntellect = state.intellect;
  const initStress = state.stress;

  step(state, 'activity:study');
  assert.equal(state.intellect, initIntellect + 5);
  assert.equal(state.stress, initStress + 7);
});

test('activity:train boosts athletics and activity:art boosts charm', () => {
  const state = createState(10);
  step(state, 'activity:train');
  assert.equal(state.athletics, 15);

  step(state, 'activity:art');
  assert.equal(state.charm, 15);
});

test('activity:rest relieves accumulated stress', () => {
  const state = createState(10);
  state.stress = 50;
  step(state, 'activity:rest');
  assert.equal(state.stress, 25);
});

test('talk:aria boosts affection scaling with intellect', () => {
  const state = createState(10);
  state.intellect = 30;
  step(state, 'talk:aria');
  assert.equal(state.affection.aria > 5, true);
});

test('date:chloe deducts 20 allowance, boosts affection and unlocks CG', () => {
  const state = createState(10);
  state.allowance = 50;
  step(state, 'date:chloe');
  assert.equal(state.allowance, 30);
  assert.equal(state.affection.chloe >= 15, true);
  assert.equal(state.cgUnlocked.length, 1);
});

test('gift:serena deducts 25 allowance and awards large affection boost', () => {
  const state = createState(10);
  state.allowance = 50;
  step(state, 'gift:serena');
  assert.equal(state.allowance, 25);
  assert.equal(state.affection.serena, 20);
});

test('advancing time cycles periods and increments days', () => {
  const state = createState(10);
  step(state, 'activity:study'); // Morning -> Afternoon
  assert.equal(state.day, 1);
  assert.equal(state.timeOfDay, 1);

  step(state, 'activity:study'); // Afternoon -> Day 2 Morning
  assert.equal(state.day, 2);
  assert.equal(state.timeOfDay, 0);
});

test('reaching Day 14 offers festival confession choices', () => {
  const state = createState(10);
  state.day = 14;
  const acts = legalActions(state);
  assert.equal(acts.includes('confess:aria'), true);
  assert.equal(acts.includes('confess:chloe'), true);
  assert.equal(acts.includes('confess:serena'), true);
  assert.equal(acts.includes('confess:solo'), true);
});

test('confession with high affection and stat met achieves romantic victory', () => {
  const state = createState(10);
  state.day = 14;
  state.affection.aria = 85;
  state.intellect = 30;

  const res = step(state, 'confess:aria');
  assert.equal(state.done, true);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
  assert.equal(res.done, true);
  assert.equal(res.reward > 50, true);
});

test('confession with low affection triggers gentle decline', () => {
  const state = createState(10);
  state.day = 14;
  state.affection.aria = 40;

  const res = step(state, 'confess:aria');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
  assert.equal(res.reward < 0, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(1);
  const snap = JSON.stringify(state);
  assert.throws(() => {
    step(state, 'invalid:dating:action');
  });
  assert.equal(JSON.stringify(state), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(606);
  const s2 = createState(606);

  step(s1, 'activity:study');
  step(s2, 'activity:study');
  step(s1, 'talk:aria');
  step(s2, 'talk:aria');

  assert.deepEqual(s1, s2);
});
