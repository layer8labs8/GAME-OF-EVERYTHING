const test = require('node:test');
const assert = require('node:assert/strict');
const {
  WIDTH,
  HEIGHT,
  MAX_STAGES,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes stage 1 at tick 0 with 0 clones', () => {
  const s = createState(42);
  assert.equal(s.stage, 1);
  assert.equal(s.tick, 0);
  assert.equal(s.clones.length, 0);
  assert.equal(s.player.x, 1);
  assert.equal(s.player.y, 1);
  assert.equal(s.done, false);
});

test('gate blocks movement when closed', () => {
  const s = createState(42);
  // In Chamber 1, Gate G1 is at (3,4).
  // Position player directly adjacent to closed gate at (2,4)
  s.player = { x: 2, y: 4 };
  s.gates[0].open = false;
  const actions = legalActions(s);
  assert.ok(!actions.includes('right'), 'Cannot step through closed gate G1');
});

test('stepping on plate opens corresponding gate', () => {
  const s = createState(42);
  // Position player directly above plate P1 at (1, 5)
  s.player = { x: 1, y: 4 };
  step(s, 'down');
  assert.equal(s.player.x, 1);
  assert.equal(s.player.y, 5);
  assert.equal(s.gates[0].open, true, 'Gate 1 should open when standing on Plate 1');
});

test('rewind spawns an Echo Clone and resets player to entrance', () => {
  const s = createState(42);
  step(s, 'down');
  step(s, 'down');
  assert.equal(s.currentRecording.length, 2);
  step(s, 'rewind');
  assert.equal(s.clones.length, 1);
  assert.deepEqual(s.clones[0], ['down', 'down']);
  assert.equal(s.tick, 0);
  assert.equal(s.player.x, s.startPos.x);
  assert.equal(s.player.y, s.startPos.y);
  assert.equal(s.rewindsUsed, 1);
});

test('echo clone replays actions and opens gate for present player', () => {
  const s = createState(42);
  // Loop 1: Walk to plate P1 at (1,5) and hold
  // Path from (1,1) to (1,5) is 4 'down' steps
  step(s, 'down');
  step(s, 'down');
  step(s, 'down');
  step(s, 'down');
  // Wait on plate
  step(s, 'wait');
  step(s, 'wait');
  assert.equal(s.gates[0].open, true);

  // Rewind to spawn Echo Clone 1
  step(s, 'rewind');
  assert.equal(s.clones.length, 1);

  // Loop 2: Echo steps down to plate while player moves along alternate path
  // Step 1
  step(s, 'wait');
  // Step 2
  step(s, 'wait');
  // Step 3
  step(s, 'wait');
  // Step 4
  step(s, 'wait');
  // Step 5 (Echo reached plate and is waiting)
  step(s, 'wait');

  // Verify Echo clone position and gate state
  assert.equal(s.clonePositions[0].x, 1);
  assert.equal(s.clonePositions[0].y, 5);
  assert.equal(s.gates[0].open, true, 'Gate should be held open by Echo clone');
});

test('reaching exit clears chamber and advances stage', () => {
  const s = createState(42);
  // Position player adjacent to exit (6,6)
  s.player = { x: 5, y: 6 };
  assert.ok(legalActions(s).includes('right'));
  const res = step(s, 'right');
  assert.equal(s.stage, 2);
  assert.ok(res.reward > 0);
});

test('reaching exit on stage 3 triggers victory', () => {
  const s = createState(42);
  s.stage = 3;
  s.player = { x: 5, y: 6 };
  const res = step(s, 'right');
  assert.equal(s.won, true);
  assert.equal(s.done, true);
  assert.equal(isOver(s), true);
  assert.ok(res.reward >= 400);
});

test('exceeding max rewinds triggers defeat', () => {
  const s = createState(42);
  s.rewindsUsed = s.maxRewinds;
  s.tick = s.maxTicksPerLoop - 1;
  const res = step(s, 'wait');
  assert.equal(s.done, true);
  assert.equal(s.won, false);
  assert.ok(res.reward < 0);
});

test('illegal action throws without mutating state', () => {
  const s = createState(42);
  const snap = JSON.stringify(s);
  assert.throws(() => {
    step(s, 'up'); // Perimeter wall at (1,0)
  }, /Illegal action/);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(777);
  const s2 = createState(777);
  assert.deepEqual(s1, s2);

  const actions = ['down', 'down', 'wait', 'rewind', 'down', 'wait'];
  for (const act of actions) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepEqual(s1, s2);
  assert.equal(score(s1), score(s2));
});
