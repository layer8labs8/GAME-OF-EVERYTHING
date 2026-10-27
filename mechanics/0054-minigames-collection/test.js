const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  TOTAL_STAGES,
  INITIAL_LIVES
} = require('./www/logic.js');

test('createState initializes stage 0, 4 lives, 0 score, and dodge prompt', () => {
  const state = createState(42);
  assert.equal(state.stageIndex, 0);
  assert.equal(state.totalStages, TOTAL_STAGES);
  assert.equal(state.lives, INITIAL_LIVES);
  assert.equal(state.score, 0);
  assert.ok(state.prompt.includes('DODGE'));
  assert.equal(state.done, false);
});

test('stage 0 DODGE succeeds when moving to safe lane', () => {
  const state = createState(42);
  const danger = state.dangerLane;
  // Move to a safe lane
  const safeLane = (danger === 0) ? 1 : 0;
  if (safeLane < state.playerLane) step(state, 'move_left');
  else if (safeLane > state.playerLane) step(state, 'move_right');
  else step(state, 'stay');

  step(state, 'stay'); // conclude stage 0

  assert.equal(state.stageIndex, 1); // Advanced to CATCH
  assert.equal(state.stagesWon, 1);
  assert.equal(state.lives, INITIAL_LIVES);
});

test('stage 1 CATCH succeeds when matching target lane', () => {
  const state = createState(42);
  state.stageIndex = 1;
  state.targetLane = 2;
  state.playerLane = 1;
  state.stageStep = 0;
  state.maxStageSteps = 2;

  step(state, 'move_right'); // playerLane becomes 2
  step(state, 'stay');       // concludes

  assert.equal(state.stageIndex, 2); // Advanced to PUMP
  assert.equal(state.stagesWon, 1);
});

test('stage 2 PUMP succeeds upon executing 3 pumps', () => {
  const state = createState(42);
  state.stageIndex = 2;
  state.pumps = 0;
  state.targetPumps = 3;
  state.stageStep = 0;
  state.maxStageSteps = 4;

  step(state, 'pump');
  step(state, 'pump');
  step(state, 'pump');

  assert.equal(state.stageIndex, 3); // Advanced to MATCH
  assert.equal(state.stagesWon, 1);
});

test('stage 3 MATCH succeeds upon selecting matching symbol slot', () => {
  const state = createState(42);
  state.stageIndex = 3;
  state.correctOptionSlot = 1;
  state.stageStep = 0;
  state.maxStageSteps = 1;

  step(state, 'pick:1');

  assert.equal(state.stageIndex, 4); // Advanced to DEFLECT
  assert.equal(state.stagesWon, 1);
});

test('stage 4 DEFLECT parries incoming projectile and wins gauntlet', () => {
  const state = createState(42);
  state.stageIndex = 4;
  state.projectileDist = 2;
  state.stageStep = 0;
  state.maxStageSteps = 2;

  step(state, 'wait'); // projectile moves to dist 1
  assert.equal(state.projectileDist, 1);

  const res = step(state, 'deflect'); // perfect deflect!
  assert.equal(state.deflected, true);
  assert.equal(state.won, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.ok(score(state) > 1000);
});

test('failing a stage deducts a life', () => {
  const state = createState(42);
  // Stay in danger lane
  state.playerLane = state.dangerLane;
  step(state, 'stay');
  step(state, 'stay');

  assert.equal(state.lives, INITIAL_LIVES - 1);
  assert.equal(state.stagesWon, 0);
});

test('losing all lives triggers defeat', () => {
  const state = createState(42);
  state.lives = 1;
  state.playerLane = state.dangerLane;

  step(state, 'stay');
  step(state, 'stay');

  assert.equal(state.lives, 0);
  assert.equal(state.lost, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(42);
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'deflect'); // illegal in stage 0 (DODGE)
  });

  assert.equal(JSON.stringify(state), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const actions = ['stay', 'stay'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
