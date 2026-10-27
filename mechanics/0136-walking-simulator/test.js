const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes walk at coastal_trail with 0 memories', () => {
  const state = createState(42);
  assert.equal(state.location, 'coastal_trail');
  assert.equal(state.discoveredMemories.length, 0);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('walk:cottage shifts location along path and logs narrative reflection', () => {
  const state = createState(10);
  step(state, 'walk:cottage');
  assert.equal(state.location, 'cottage');
  const acts = legalActions(state);
  assert.equal(acts.includes('inspect:piano'), true);
});

test('inspect:cairn uncovers memory_departure', () => {
  const state = createState(10);
  const initScore = state.score;
  step(state, 'inspect:cairn');
  assert.equal(state.discoveredMemories.includes('memory_departure'), true);
  assert.equal(state.score > initScore, true);
});

test('inspect:piano in cottage uncovers memory_melody', () => {
  const state = createState(10);
  step(state, 'walk:cottage');
  step(state, 'inspect:piano');
  assert.equal(state.discoveredMemories.includes('memory_melody'), true);
});

test('inspect:windchime_tree in groves uncovers memory_storm', () => {
  const state = createState(10);
  step(state, 'walk:groves');
  step(state, 'inspect:windchime_tree');
  assert.equal(state.discoveredMemories.includes('memory_storm'), true);
});

test('inspect:binoculars at overlook uncovers memory_constellation', () => {
  const state = createState(10);
  step(state, 'walk:groves');
  step(state, 'walk:overlook');
  step(state, 'inspect:binoculars');
  assert.equal(state.discoveredMemories.includes('memory_constellation'), true);
});

test('tune:radio awards clarity and marks current location tuned', () => {
  const state = createState(10);
  const initClarity = state.clarity;
  step(state, 'tune:radio');
  assert.equal(state.tunedLocations.coastal_trail, true);
  assert.equal(state.clarity > initClarity, true);
});

test('contemplate:surroundings awards peaceful reflection score', () => {
  const state = createState(10);
  const initScore = state.score;
  step(state, 'contemplate:surroundings');
  assert.equal(state.score > initScore, true);
});

test('gathering all 4 memories unlocks action:align_telescope at observatory', () => {
  const state = createState(10);
  // Uncover all 4 memories
  step(state, 'inspect:cairn'); // memory_departure
  step(state, 'walk:cottage');
  step(state, 'inspect:piano'); // memory_melody
  step(state, 'walk:groves');
  step(state, 'inspect:windchime_tree'); // memory_storm
  step(state, 'walk:overlook');
  step(state, 'inspect:binoculars'); // memory_constellation

  assert.equal(state.discoveredMemories.length, 4);

  step(state, 'walk:observatory');
  const acts = legalActions(state);
  assert.equal(acts.includes('action:align_telescope'), true);
});

test('action:align_telescope achieves emotional climax and victory', () => {
  const state = createState(10);
  // Uncover all 4 memories
  step(state, 'inspect:cairn');
  step(state, 'walk:cottage');
  step(state, 'inspect:piano');
  step(state, 'walk:groves');
  step(state, 'inspect:windchime_tree');
  step(state, 'walk:overlook');
  step(state, 'inspect:binoculars');
  step(state, 'walk:observatory');

  const res = step(state, 'action:align_telescope');
  assert.equal(state.done, true);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
  assert.equal(res.done, true);
  assert.equal(res.reward > 50, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(1);
  const snap = JSON.stringify(state);
  assert.throws(() => {
    step(state, 'invalid:walking:action');
  });
  assert.equal(JSON.stringify(state), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(909);
  const s2 = createState(909);

  step(s1, 'inspect:cairn');
  step(s2, 'inspect:cairn');
  step(s1, 'walk:cottage');
  step(s2, 'walk:cottage');

  assert.deepEqual(s1, s2);
});
