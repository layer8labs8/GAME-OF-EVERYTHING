const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TOKENS_PER_PLAYER,
  TRACK_LENGTH,
  GOAL_STEP,
  SAFE_SPACES,
  createState,
  legalActions,
  step,
  isOver,
  score,
  getTokenTrackSpace,
  getLegalMovesForRoll
} = require('./www/logic.js');

test('createState initializes 3 tokens each in yard, phase roll', () => {
  const s = createState(42);
  assert.equal(s.turn, 1);
  assert.equal(s.phase, 'roll');
  assert.equal(s.playerTokens.length, 3);
  assert.equal(s.oppTokens.length, 3);
  assert.ok(s.playerTokens.every(t => t.state === 'yard'));
  assert.ok(s.oppTokens.every(t => t.state === 'yard'));
  assert.equal(s.done, false);
  assert.equal(s.won, false);
});

test('initial legal action is only roll', () => {
  const s = createState(42);
  assert.deepEqual(legalActions(s), ['roll']);
});

test('rolling a 6 enables deploying token from yard', () => {
  const s = createState(42);
  // Force roll to 6
  s.phase = 'move';
  s.currentRoll = 6;
  const legals = legalActions(s);
  assert.ok(legals.includes('move:p0'));
  assert.ok(legals.includes('move:p1'));
  assert.ok(legals.includes('move:p2'));
});

test('deploying token sets it to active at progress 0', () => {
  const s = createState(42);
  s.phase = 'move';
  s.currentRoll = 6;

  step(s, 'move:p0');
  assert.equal(s.playerTokens[0].state, 'active');
  assert.equal(s.playerTokens[0].progress, 0);
  assert.equal(getTokenTrackSpace(s.playerTokens[0]), 0);
  // Rolling 6 gives bonus roll!
  assert.equal(s.phase, 'roll');
});

test('moving active token advances progress by roll value', () => {
  const s = createState(42);
  s.playerTokens[0].state = 'active';
  s.playerTokens[0].progress = 10;
  s.phase = 'move';
  s.currentRoll = 4;

  step(s, 'move:p0');
  assert.equal(s.playerTokens[0].progress, 14);
  assert.equal(getTokenTrackSpace(s.playerTokens[0]), 14);
});

test('landing on opponent token captures it back to yard', () => {
  const s = createState(42);
  // Player at track space 6 (progress 6)
  s.playerTokens[0].state = 'active';
  s.playerTokens[0].progress = 6;

  // Opponent at track space 10 (opp progress: (10 - 20 + 40) % 40 = 30)
  s.oppTokens[0].state = 'active';
  s.oppTokens[0].progress = 30; // track space: (20 + 30) % 40 = 10 (not safe)

  s.phase = 'move';
  s.currentRoll = 4; // Moves p0 from 6 to 10!

  step(s, 'move:p0');
  assert.equal(s.playerCaptures, 1);
});

test('safe spaces protect tokens from capture', () => {
  const s = createState(42);
  // Space 8 is in SAFE_SPACES
  s.playerTokens[0].state = 'active';
  s.playerTokens[0].progress = 5;

  // Opponent at space 8 (progress: 28)
  s.oppTokens[0].state = 'active';
  s.oppTokens[0].progress = 28; // track space: (20 + 28) % 40 = 8 (SAFE!)

  s.phase = 'move';
  s.currentRoll = 3; // Moves p0 from 5 to 8!

  step(s, 'move:p0');
  // Opponent token should remain active and NOT be captured
  assert.equal(s.playerCaptures, 0);
});

test('reaching goal step 45 marks token as home', () => {
  const s = createState(42);
  s.playerTokens[0].state = 'active';
  s.playerTokens[0].progress = 42;
  s.phase = 'move';
  s.currentRoll = 3; // 42 + 3 = 45 (Home!)

  step(s, 'move:p0');
  assert.equal(s.playerTokens[0].state, 'home');
  assert.equal(s.playerHomeCount, 1);
});

test('guiding all 3 tokens home achieves Victory', () => {
  const s = createState(42);
  s.playerTokens[0].state = 'home';
  s.playerTokens[1].state = 'home';
  s.playerTokens[2].state = 'active';
  s.playerTokens[2].progress = 43;
  s.playerHomeCount = 2;

  s.phase = 'move';
  s.currentRoll = 2; // 43 + 2 = 45

  step(s, 'move:p2');
  assert.equal(s.playerHomeCount, 3);
  assert.equal(s.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) > 1500);
});

test('illegal action throws error', () => {
  const s = createState(42);
  assert.throws(() => {
    step(s, 'move:nonexistent');
  }, /Illegal action/);
});

test('state simulation is deterministic across identical seed', () => {
  const s1 = createState(999);
  const s2 = createState(999);
  assert.deepEqual(s1, s2);

  step(s1, 'roll');
  step(s2, 'roll');
  assert.deepEqual(s1, s2);
});
