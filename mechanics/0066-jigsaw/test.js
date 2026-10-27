const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STAGE_CONFIGS,
  MAX_STAGES,
  MAX_MOVES_PER_STAGE,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes stage 1 with 3x3 mosaic and 9 tray pieces', () => {
  const s = createState(42);
  assert.equal(s.stage, 1);
  assert.equal(s.rows, 3);
  assert.equal(s.cols, 3);
  assert.equal(s.tray.length, 9);
  assert.equal(s.done, false);
  assert.equal(s.won, false);
  assert.equal(s.board.length, 3);
  assert.equal(s.board[0].length, 3);
});

test('corner and border pieces have flat edges matching frame', () => {
  const s = createState(12345);
  // Find the piece intended for top-left (0,0)
  const topLeft = s.tray.find(p => p.targetRow === 0 && p.targetCol === 0);
  assert.ok(topLeft);
  assert.equal(topLeft.edges.top, 0, 'Top-left piece top must be flat 0');
  assert.equal(topLeft.edges.left, 0, 'Top-left piece left must be flat 0');
  assert.notEqual(topLeft.edges.right, 0, 'Top-left right must be tab or blank');
  assert.notEqual(topLeft.edges.bottom, 0, 'Top-left bottom must be tab or blank');
});

test('legalActions permits placing top-left piece at (0,0)', () => {
  const s = createState(777);
  const topLeft = s.tray.find(p => p.targetRow === 0 && p.targetCol === 0);
  const actions = legalActions(s);
  assert.ok(actions.includes(`place:${topLeft.id},0,0`));
});

test('placing a piece locks it into the board and updates state', () => {
  const s = createState(42);
  const topLeft = s.tray.find(p => p.targetRow === 0 && p.targetCol === 0);
  const res = step(s, `place:${topLeft.id},0,0`);

  assert.equal(topLeft.placed, true);
  assert.equal(s.board[0][0].id, topLeft.id);
  assert.equal(s.correctPlacements, 1);
  assert.ok(res.reward > 0);
  assert.equal(s.stageMoves, 1);
});

test('illegal action throws an error', () => {
  const s = createState(42);
  assert.throws(() => {
    step(s, 'place:999,0,0');
  }, /Illegal action/);
});

test('remove returns placed piece back to tray', () => {
  const s = createState(42);
  const topLeft = s.tray.find(p => p.targetRow === 0 && p.targetCol === 0);
  step(s, `place:${topLeft.id},0,0`);
  assert.equal(topLeft.placed, true);

  step(s, 'remove:0,0');
  assert.equal(topLeft.placed, false);
  assert.equal(s.board[0][0], null);
});

test('clear returns all placed pieces to tray', () => {
  const s = createState(42);
  const topLeft = s.tray.find(p => p.targetRow === 0 && p.targetCol === 0);
  step(s, `place:${topLeft.id},0,0`);

  assert.ok(legalActions(s).includes('clear'));
  step(s, 'clear');

  assert.equal(s.board[0][0], null);
  assert.equal(topLeft.placed, false);
});

test('assembling all pieces advances stage to Emerald Dragon (3x4)', () => {
  const s = createState(999);
  // Place all pieces in their target positions
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const piece = s.tray.find(p => p.targetRow === r && p.targetCol === c);
      step(s, `place:${piece.id},${r},${c}`);
    }
  }

  assert.equal(s.stage, 2);
  assert.equal(s.rows, 3);
  assert.equal(s.cols, 4);
  assert.equal(s.tray.length, 12);
  assert.equal(s.themeName, 'Emerald Dragon');
  assert.equal(s.done, false);
});

test('completing all 3 stages triggers victory', () => {
  const s = createState(100);

  // Complete Stage 1 (3x3)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const piece = s.tray.find(p => p.targetRow === r && p.targetCol === c);
      step(s, `place:${piece.id},${r},${c}`);
    }
  }

  // Complete Stage 2 (3x4)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const piece = s.tray.find(p => p.targetRow === r && p.targetCol === c);
      step(s, `place:${piece.id},${r},${c}`);
    }
  }

  // Complete Stage 3 (4x4)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const piece = s.tray.find(p => p.targetRow === r && p.targetCol === c);
      step(s, `place:${piece.id},${r},${c}`);
    }
  }

  assert.equal(s.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) > 1000);
  assert.equal(legalActions(s).length, 0);
});

test('exceeding move budget ends game in defeat', () => {
  const s = createState(555);
  const topLeft = s.tray.find(p => p.targetRow === 0 && p.targetCol === 0);

  // Cycle place and remove until moves run out
  for (let i = 0; i < MAX_MOVES_PER_STAGE; i++) {
    if (topLeft.placed) {
      step(s, 'remove:0,0');
    } else {
      step(s, `place:${topLeft.id},0,0`);
    }
    if (s.done) break;
  }

  assert.equal(s.done, true);
  assert.equal(s.won, false);
  assert.ok(isOver(s));
});

test('state is deterministic across same seed', () => {
  const s1 = createState(888);
  const s2 = createState(888);
  assert.deepEqual(s1, s2);

  const act1 = legalActions(s1)[0];
  step(s1, act1);
  step(s2, act1);
  assert.deepEqual(s1, s2);
});
