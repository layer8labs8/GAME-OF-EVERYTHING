const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  INITIAL_BALLS,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes table with 3 balls, inPlunger true and 0 score', () => {
  const s = createState(42);
  assert.equal(s.ballsLeft, INITIAL_BALLS);
  assert.equal(s.inPlunger, true);
  assert.equal(s.scoreVal, 0);
  assert.equal(s.multiplier, 1);
  assert.equal(s.done, false);
});

test('legalActions in plunger offers launch and wait', () => {
  const s = createState(42);
  const actions = legalActions(s);
  assert.ok(actions.includes('launch'));
  assert.ok(actions.includes('wait'));
  assert.ok(!actions.includes('flip_left'));
});

test('launching ball sets upward velocity and exits plunger lane', () => {
  const s = createState(42);
  step(s, 'launch');
  assert.equal(s.inPlunger, false);
  assert.ok(s.ball.vy < 0, 'Ball should have upward launch velocity');
  assert.ok(legalActions(s).includes('flip_left'));
});

test('bumper collision reflects ball and scores points', () => {
  const s = createState(42);
  s.inPlunger = false;
  // Position ball just above bumper 1 at (105, 140) moving downward
  s.ball.x = 105;
  s.ball.y = 115;
  s.ball.vx = 0;
  s.ball.vy = 5;

  const initialScore = s.scoreVal;
  step(s, 'wait');

  assert.ok(s.scoreVal > initialScore, 'Bumper collision should award score');
  assert.ok(s.ball.vy < 0, 'Ball should bounce upward off bumper');
});

test('lighting all rollover lanes boosts combo multiplier', () => {
  const s = createState(42);
  s.inPlunger = false;
  s.rollovers[0].lit = true;
  s.rollovers[1].lit = true;

  // Position ball to trigger rollover 3 at (210, 65)
  s.ball.x = 210;
  s.ball.y = 65;
  step(s, 'wait');

  assert.equal(s.multiplier, 2, 'Multiplier should increase to 2X');
});

test('active flipper imparts upward impulse on ball', () => {
  const s = createState(42);
  s.inPlunger = false;
  // Position ball in left flipper strike zone (100, 435) falling down
  s.ball.x = 100;
  s.ball.y = 435;
  s.ball.vx = 0;
  s.ball.vy = 4;

  step(s, 'flip_left');
  assert.ok(s.ball.vy < 0, 'Flipper should propel ball upward');
});

test('ball draining deducts 1 ball and resets to plunger if balls remain', () => {
  const s = createState(42);
  s.inPlunger = false;
  // Position ball in bottom drain
  s.ball.x = 150;
  s.ball.y = 485;
  s.ball.vy = 5;

  step(s, 'wait');
  assert.equal(s.ballsLeft, INITIAL_BALLS - 1);
  assert.equal(s.inPlunger, true);
  assert.equal(s.done, false);
});

test('losing all 3 balls ends the game', () => {
  const s = createState(42);
  s.ballsLeft = 1;
  s.inPlunger = false;
  s.ball.x = 150;
  s.ball.y = 485;
  s.ball.vy = 5;

  const res = step(s, 'wait');
  assert.equal(s.ballsLeft, 0);
  assert.equal(s.done, true);
  assert.equal(isOver(s), true);
  assert.ok(res.done);
});

test('illegal action throws without mutating state', () => {
  const s = createState(42);
  const snap = JSON.stringify(s);
  assert.throws(() => {
    step(s, 'flip_left'); // In plunger, flip_left is illegal
  }, /Illegal action/);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic physics simulation', () => {
  const s1 = createState(808);
  const s2 = createState(808);
  assert.deepEqual(s1.ball, s2.ball);

  step(s1, 'launch');
  step(s2, 'launch');
  for (let i = 0; i < 10; i++) {
    step(s1, 'wait');
    step(s2, 'wait');
  }

  assert.deepEqual(s1.ball, s2.ball);
  assert.equal(score(s1), score(s2));
});
