const test = require('node:test');
const assert = require('node:assert/strict');
const {
  WIDTH,
  HEIGHT,
  MAX_STAGES,
  MAX_COMMANDS,
  OPCODES,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes stage 1 with rover at (1,1), facing East and empty program', () => {
  const s = createState(42);
  assert.equal(s.stage, 1);
  assert.equal(s.rover.x, 1);
  assert.equal(s.rover.y, 1);
  assert.equal(s.rover.facing, 1); // East
  assert.equal(s.program.length, 0);
  assert.equal(s.nodes.length, 2);
  assert.equal(s.done, false);
});

test('legalActions allows adding commands and forbids run when empty', () => {
  const s = createState(42);
  const actions = legalActions(s);
  assert.ok(actions.includes('add:forward'));
  assert.ok(actions.includes('add:left'));
  assert.ok(!actions.includes('run'), 'Cannot run empty program');
  assert.ok(!actions.includes('clear'), 'Cannot clear empty program');
});

test('adding and removing commands updates buffer accurately', () => {
  const s = createState(42);
  step(s, 'add:forward');
  step(s, 'add:right');
  step(s, 'add:light');
  assert.deepEqual(s.program, ['forward', 'right', 'light']);
  assert.ok(legalActions(s).includes('run'));
  assert.ok(legalActions(s).includes('clear'));

  step(s, 'remove:1');
  assert.deepEqual(s.program, ['forward', 'light']);
});

test('clear empties the program buffer', () => {
  const s = createState(42);
  step(s, 'add:forward');
  step(s, 'clear');
  assert.equal(s.program.length, 0);
  assert.ok(!legalActions(s).includes('run'));
});

test('run executes forward, turn, and jump routines', () => {
  const s = createState(42);
  // Stage 1: Rover at (1,1) facing East.
  // Add forward 2 times, then right, then forward
  step(s, 'add:forward');
  step(s, 'add:forward');
  step(s, 'add:right');
  step(s, 'add:forward');
  step(s, 'run');

  // Rover should be at (3, 2) facing South (2)
  assert.equal(s.rover.x, 3);
  assert.equal(s.rover.y, 2);
  assert.equal(s.rover.facing, 2);
});

test('illuminating all nodes clears the stage and advances', () => {
  const s = createState(42);
  // Stage 1 nodes at (5,1) and (5,4).
  // Rover starts at (1,1) facing East.
  // Move 4 forward -> (5,1), light, turn right, move 3 forward -> (5,4), light.
  step(s, 'add:forward');
  step(s, 'add:forward');
  step(s, 'add:forward');
  step(s, 'add:forward');
  step(s, 'add:light');
  step(s, 'add:right');
  step(s, 'add:forward');
  step(s, 'add:forward');
  step(s, 'add:forward');
  step(s, 'add:light');

  const res = step(s, 'run');
  assert.equal(s.stage, 2, 'Should advance to Stage 2');
  assert.ok(res.reward > 0);
});

test('clearing all 3 stages triggers victory', () => {
  const s = createState(42);
  s.stage = 3;
  // Mark all nodes lit directly
  s.nodes = [{ x: 1, y: 1, lit: false }];
  s.program = ['light'];
  const res = step(s, 'run');
  assert.equal(s.won, true);
  assert.equal(s.done, true);
  assert.equal(isOver(s), true);
  assert.ok(res.reward >= 500);
});

test('exceeding max runs triggers defeat', () => {
  const s = createState(42);
  s.runsUsed = s.maxRuns - 1;
  step(s, 'add:forward');
  const res = step(s, 'run');
  assert.equal(s.done, true);
  assert.equal(s.won, false);
  assert.ok(res.reward < 0);
});

test('illegal action throws without mutating state', () => {
  const s = createState(42);
  const snap = JSON.stringify(s);
  assert.throws(() => {
    step(s, 'run'); // Cannot run empty program
  }, /Illegal action/);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(333);
  const s2 = createState(333);
  assert.deepEqual(s1, s2);

  const actions = ['add:forward', 'add:right', 'run', 'add:left'];
  for (const act of actions) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepEqual(s1, s2);
  assert.equal(score(s1), score(s2));
});
