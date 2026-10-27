const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  findWordPath,
  TARGET_SCORE,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes 4x4 grid, targetScore, score 0 and max turns', () => {
  const state = createState(42);
  assert.equal(state.grid.length, 4);
  assert.equal(state.grid[0].length, 4);
  assert.equal(state.score, 0);
  assert.equal(state.targetScore, TARGET_SCORE);
  assert.equal(state.turnsLeft, MAX_TURNS);
  assert.equal(state.done, false);
});

test('findWordPath detects adjacent word paths on the grid', () => {
  const customGrid = [
    ['C', 'A', 'T', 'S'],
    ['D', 'O', 'G', 'X'],
    ['R', 'U', 'N', 'Y'],
    ['B', 'E', 'D', 'Z']
  ];

  const catPath = findWordPath(customGrid, 'CAT');
  assert.ok(catPath);
  assert.equal(catPath.length, 3);
  assert.deepEqual(catPath[0], { r: 0, c: 0 }); // C
  assert.deepEqual(catPath[1], { r: 0, c: 1 }); // A
  assert.deepEqual(catPath[2], { r: 0, c: 2 }); // T

  const dogPath = findWordPath(customGrid, 'DOG');
  assert.ok(dogPath);
  assert.equal(dogPath.length, 3);

  const missingPath = findWordPath(customGrid, 'ZEBRA');
  assert.equal(missingPath, null);
});

test('legalActions returns shuffle, pass and valid board words', () => {
  const state = createState(42);
  const actions = legalActions(state);

  assert.ok(actions.includes('shuffle'));
  assert.ok(actions.includes('pass'));
  const wordActions = actions.filter(a => a.startsWith('submit:'));
  assert.ok(wordActions.length > 0);
});

test('submitting a valid word updates score, wordsFound, and cascades new tiles', () => {
  const state = createState(42);
  const wordActions = legalActions(state).filter(a => a.startsWith('submit:'));
  assert.ok(wordActions.length > 0);

  const action = wordActions[0];
  const initialTurns = state.turnsLeft;
  const res = step(state, action);

  assert.ok(state.score > 0);
  assert.equal(state.wordsFound, 1);
  assert.equal(state.turnsLeft, initialTurns - 1);
  assert.ok(res.reward > 0);

  // Grid must remain fully populated 4x4
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      assert.ok(typeof state.grid[r][c] === 'string');
      assert.ok(state.grid[r][c].length === 1);
    }
  }
});

test('shuffle randomizes board tiles and decrements turn', () => {
  const state = createState(42);
  const oldGrid = JSON.stringify(state.grid);
  const initialTurns = state.turnsLeft;

  step(state, 'shuffle');
  assert.equal(state.turnsLeft, initialTurns - 1);
  assert.notEqual(JSON.stringify(state.grid), oldGrid);
});

test('reaching targetScore achieves victory', () => {
  const state = createState(42);
  state.score = TARGET_SCORE;

  step(state, 'pass');
  assert.equal(state.won, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.ok(score(state) > TARGET_SCORE);
});

test('running out of turns triggers defeat', () => {
  const state = createState(42);
  state.turnsLeft = 1;

  step(state, 'pass');
  assert.equal(state.turnsLeft, 0);
  assert.equal(state.lost, true);
  assert.equal(state.done, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(42);
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'submit:NONEXISTENTWORDXYZ');
  });

  assert.equal(JSON.stringify(state), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['shuffle', 'pass'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
