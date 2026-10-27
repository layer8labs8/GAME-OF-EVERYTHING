const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes runner at 0m, 50 momentum, and 3 shields', () => {
  const state = logic.createState(42);
  assert.equal(state.distance, 0);
  assert.equal(state.momentum, 50);
  assert.equal(state.shields, 3);
  assert.ok(state.obstacles.length > 0);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('run advances distance based on momentum', () => {
  const state = logic.createState(42);
  const initialDist = state.distance;
  const res = logic.step(state, 'run');
  assert.ok(state.distance > initialDist);
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
});

test('jump safely clears chasm gap without shield loss', () => {
  const state = logic.createState(42);
  state.obstacles = [{ id: 'gap1', type: 'gap', distance: 15 }];
  logic.step(state, 'jump');
  assert.equal(state.shields, 3);
  assert.equal(state.streak, 1);
});

test('slide safely clears overhead duct without shield loss', () => {
  const state = logic.createState(42);
  state.obstacles = [{ id: 'duct1', type: 'duct', distance: 15 }];
  logic.step(state, 'slide');
  assert.equal(state.shields, 3);
  assert.equal(state.streak, 1);
});

test('wall_run safely clears barrier without shield loss', () => {
  const state = logic.createState(42);
  state.obstacles = [{ id: 'wall1', type: 'barrier', distance: 15 }];
  logic.step(state, 'wall_run');
  assert.equal(state.shields, 3);
  assert.equal(state.streak, 1);
});

test('unmatched action on obstacle deducts 1 shield and resets momentum', () => {
  const state = logic.createState(42);
  state.obstacles = [{ id: 'gap1', type: 'gap', distance: 15 }];
  logic.step(state, 'slide'); // Wrong action on gap!

  assert.equal(state.shields, 2);
  assert.equal(state.momentum, 20);
  assert.equal(state.streak, 0);
});

test('boost consumes 25 momentum and doubles traversal speed', () => {
  const state = logic.createState(42);
  state.obstacles = [];
  state.momentum = 60;
  logic.step(state, 'boost');

  assert.equal(state.momentum, 35);
  assert.ok(state.distance >= 30);
});

test('collecting ring adds momentum and bonus score', () => {
  const state = logic.createState(42);
  state.obstacles = [{ id: 'ring1', type: 'ring', distance: 15 }];
  state.momentum = 40;
  logic.step(state, 'run');

  assert.equal(state.momentum, 58); // 40 + 20 - 2 decay
});

test('reaching target distance triggers victory', () => {
  const state = logic.createState(42);
  state.distance = 990;
  state.obstacles = [];
  logic.step(state, 'run');

  assert.equal(state.distance, 1000);
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.equal(logic.legalActions(state).length, 0);
});

test('losing all shields triggers defeat', () => {
  const state = logic.createState(42);
  state.shields = 1;
  state.obstacles = [{ id: 'gap1', type: 'gap', distance: 15 }];
  logic.step(state, 'run'); // Collision

  assert.equal(state.shields, 0);
  assert.equal(state.lost, true);
  assert.equal(logic.isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(42);
  state.momentum = 10;
  assert.throws(() => logic.step(state, 'boost'), /Illegal action/);
  assert.equal(state.momentum, 10);
});

test('same seed and actions yield strictly deterministic state', () => {
  const actions = ['run', 'jump', 'slide', 'wall_run', 'run', 'boost'];
  const s1 = logic.createState(888);
  const s2 = logic.createState(888);

  for (const act of actions) {
    if (logic.legalActions(s1).includes(act)) {
      logic.step(s1, act);
      logic.step(s2, act);
    }
  }
  assert.deepEqual(s1, s2);
});
