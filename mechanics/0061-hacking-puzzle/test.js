const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GRID_SIZE,
  BUFFER_LIMIT,
  MAX_STAGES,
  BYTE_VOCAB,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes stage 1 with 5x5 matrix and active row 0', () => {
  const s = createState(42);
  assert.equal(s.stage, 1);
  assert.equal(s.matrix.length, GRID_SIZE);
  assert.equal(s.matrix[0].length, GRID_SIZE);
  assert.equal(s.axis, 'row');
  assert.equal(s.activeLine, 0);
  assert.equal(s.buffer.length, 0);
  assert.equal(s.daemons.length, 2);
  assert.equal(s.done, false);
});

test('legalActions on move 1 allows picking any cell in row 0', () => {
  const s = createState(42);
  const actions = legalActions(s);
  assert.equal(actions.length, 5);
  for (let c = 0; c < 5; c++) {
    assert.ok(actions.includes(`pick:0,${c}`));
  }
});

test('picking cell at (0, c) appends byte to buffer and switches to column c', () => {
  const s = createState(42);
  const expectedByte = s.matrix[0][2];
  step(s, 'pick:0,2');

  assert.equal(s.buffer.length, 1);
  assert.equal(s.buffer[0], expectedByte);
  assert.equal(s.axis, 'col');
  assert.equal(s.activeLine, 2);
  assert.equal(s.used[0][2], true);

  // Next legal moves must be in column 2 (except row 0 which is consumed)
  const nextActions = legalActions(s);
  assert.equal(nextActions.length, 4);
  assert.ok(!nextActions.includes('pick:0,2'));
  assert.ok(nextActions.includes('pick:1,2'));
});

test('subsequent pick in column switches axis back to row', () => {
  const s = createState(42);
  step(s, 'pick:0,2');
  step(s, 'pick:3,2');

  assert.equal(s.buffer.length, 2);
  assert.equal(s.axis, 'row');
  assert.equal(s.activeLine, 3);
});

test('matching daemon sequence marks daemon uploaded', () => {
  const s = createState(42);
  // Set daemons and buffer directly to test matching logic
  s.daemons[0].sequence = ['1C', 'BD'];
  s.matrix[0][0] = '1C';
  s.matrix[1][0] = 'BD';

  step(s, 'pick:0,0');
  assert.equal(s.daemons[0].uploaded, false);
  step(s, 'pick:1,0');
  assert.equal(s.daemons[0].uploaded, true, 'Daemon 1 should be uploaded after 1C, BD match');
});

test('uploading all daemons advances to next stage', () => {
  const s = createState(42);
  // Match both daemons
  s.daemons[0].sequence = ['1C'];
  s.daemons[1].sequence = ['BD'];
  s.matrix[0][0] = '1C';
  s.matrix[1][0] = 'BD';

  step(s, 'pick:0,0');
  const res = step(s, 'pick:1,0');

  assert.equal(s.stage, 2, 'Should advance to Stage 2');
  assert.ok(res.reward > 0);
});

test('breaching final stage triggers victory', () => {
  const s = createState(42);
  s.stage = 3;
  s.daemons = [
    { id: 1, sequence: ['1C'], uploaded: false, reward: 40 }
  ];
  s.matrix[0][0] = '1C';
  const res = step(s, 'pick:0,0');

  assert.equal(s.won, true);
  assert.equal(s.done, true);
  assert.equal(isOver(s), true);
  assert.ok(res.reward >= 500);
});

test('exceeding max lockouts triggers defeat', () => {
  const s = createState(42);
  s.lockouts = s.maxLockouts - 1;
  // Fill buffer without matching daemons (5 picks)
  s.daemons = [{ id: 1, sequence: ['XX', 'YY', 'ZZ'], uploaded: false, reward: 50 }];
  s.buffer = ['1C', 'BD', '55', 'E9'];
  s.axis = 'row';
  s.activeLine = 0;
  const res = step(s, 'pick:0,0'); // 5th pick fills buffer

  assert.equal(s.done, true);
  assert.equal(s.won, false);
  assert.ok(res.reward < 0);
});

test('illegal action throws without mutating state', () => {
  const s = createState(42);
  const snap = JSON.stringify(s);
  assert.throws(() => {
    step(s, 'pick:2,2'); // Row 2 is not active on start (Row 0 is active)
  }, /Illegal action/);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(900);
  const s2 = createState(900);
  assert.deepEqual(s1.matrix, s2.matrix);

  step(s1, 'pick:0,1');
  step(s2, 'pick:0,1');
  assert.deepEqual(s1.buffer, s2.buffer);
  assert.equal(score(s1), score(s2));
});
