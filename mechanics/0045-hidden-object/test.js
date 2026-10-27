const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  MAX_HINTS,
  TARGET_COUNT
} = require('./www/logic.js');

test('createState initializes grid, 16 artifacts, 3 containers, 3 hints and 5 targets', () => {
  const state = createState(123);
  assert.equal(state.gridSize, 8);
  assert.equal(state.turnsLeft, MAX_TURNS);
  assert.equal(state.hintsLeft, MAX_HINTS);
  assert.equal(state.foundCount, 0);
  assert.equal(state.misclicks, 0);
  assert.equal(state.items.length, 16);
  assert.equal(state.containers.length, 3);
  assert.equal(state.targetRelics.length, TARGET_COUNT);
  assert.equal(state.done, false);
});

test('use_hint consumes 1 hint and reveals location of an unfound target relic', () => {
  const state = createState(123);
  const initialHints = state.hintsLeft;

  const res = step(state, 'use_hint');
  assert.equal(state.hintsLeft, initialHints - 1);
  assert.ok(state.lastHint);
  assert.ok(state.lastHint.name);
  assert.ok(state.lastHint.x >= 0 && state.lastHint.x < 8);
  assert.ok(state.lastHint.y >= 0 && state.lastHint.y < 8);
  assert.ok(res.reward > 0);
});

test('uncover opens container and reveals hidden contents', () => {
  const state = createState(123);
  const container = state.containers[0];
  assert.equal(container.opened, false);

  step(state, `uncover:${container.id}`);
  assert.equal(container.opened, true);
});

test('inspect on target relic collects item and increases foundCount', () => {
  const state = createState(123);
  // Find an uncovered target item
  const target = state.items.find(it => it.isTarget && !it.containerId);
  assert.ok(target);

  const res = step(state, `inspect:${target.x}:${target.y}`);
  assert.equal(target.found, true);
  assert.equal(state.foundCount, 1);
  assert.ok(res.reward >= 100);
});

test('inspect on empty cell increments misclicks and deducts turn', () => {
  const state = createState(123);
  // Find an empty cell
  let emptyX = -1, emptyY = -1;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const hasItem = state.items.some(it => it.x === x && it.y === y);
      const hasContainer = state.containers.some(c => c.x === x && c.y === y);
      if (!hasItem && !hasContainer) {
        emptyX = x; emptyY = y; break;
      }
    }
    if (emptyX !== -1) break;
  }

  assert.ok(emptyX !== -1);
  const initialTurns = state.turnsLeft;
  const res = step(state, `inspect:${emptyX}:${emptyY}`);
  assert.equal(state.misclicks, 1);
  assert.equal(state.turnsLeft, initialTurns - 1);
  assert.ok(res.reward < 0);
});

test('inspect on closed container opens it safely', () => {
  const state = createState(123);
  const container = state.containers[0];
  assert.equal(container.opened, false);

  const res = step(state, `inspect:${container.x}:${container.y}`);
  assert.equal(container.opened, true);
  assert.ok(res.reward > 0);
});

test('finding all 5 target relics achieves victory', () => {
  const state = createState(123);
  // Open all containers
  state.containers.forEach(c => { c.opened = true; });

  // Inspect all 5 targets
  const targets = state.items.filter(it => it.isTarget);
  targets.forEach(t => {
    step(state, `inspect:${t.x}:${t.y}`);
  });

  assert.equal(state.foundCount, TARGET_COUNT);
  assert.equal(state.won, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.ok(score(state) > 500);
});

test('exhausting turns triggers defeat', () => {
  const state = createState(123);
  state.turnsLeft = 1;

  step(state, 'inspect:0:0');
  assert.equal(state.turnsLeft, 0);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(123);
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'inspect:99:99'); // out of bounds
  });

  assert.equal(JSON.stringify(state), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['use_hint', 'uncover:mahogany_cabinet', 'inspect:3:3'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
