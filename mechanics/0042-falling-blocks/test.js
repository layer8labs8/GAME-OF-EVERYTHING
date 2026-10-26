const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState builds empty 10x20 well and active 4-cell piece', () => {
  const s = L.createState(7);
  assert.equal(s.board.length, 20);
  assert.equal(s.board[0].length, 10);
  assert.equal(s.piece.cells.length, 4);
  assert.equal(s.toppedOut, false);
});

test('left and right movements respect well borders', () => {
  const s = L.createState(1);
  for (let i = 0; i < 10; i++) {
    s.stallCount = 0;
    L.step(s, 'left');
  }
  assert.equal(s.piece.x, 0);
  for (let i = 0; i < 15; i++) {
    s.stallCount = 0;
    L.step(s, 'right');
  }
  const maxDx = Math.max(...s.piece.cells.map((c) => c[0]));
  assert.equal(s.piece.x + maxDx, L.W - 1);
});

test('hard drop locks piece at bottom and awards drop distance', () => {
  const s = L.createState(2);
  const gy = L.ghostY(s);
  const res = L.step(s, 'drop');
  assert.ok(gy > 15);
  assert.equal(res.reward, gy);
  assert.equal(s.board[19].some((v) => v > 0), true);
});

test('completing a full row clears it and awards 100 points', () => {
  const s = L.createState(1);
  for (let c = 0; c < 8; c++) s.board[19][c] = 2;
  // Place O-piece (kind 1) at x = 8
  s.piece = { kind: 1, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 8, y: 18, color: 2 };
  const res = L.step(s, 'down');
  assert.equal(s.lines, 1);
  assert.equal(res.reward, 100);
  // Top cell of O-piece dropped from row 18 to row 19 after clear
  assert.equal(s.board[19][8], 2);
  assert.equal(s.board[19][0], 0);
});

test('repeated lateral moves trigger automatic gravity so piece cannot stall', () => {
  const s = L.createState(1);
  const y0 = s.piece.y;
  L.step(s, 'left');
  L.step(s, 'right');
  L.step(s, 'rotate');
  assert.equal(s.piece.y, y0 + 1);
});

test('blocked spawn at top ends game with toppedOut true', () => {
  const s = L.createState(1);
  for (let r = 0; r < 4; r++) for (let c = 2; c < 8; c++) s.board[r][c] = 3;
  s.piece = { kind: 1, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 0, y: 18, color: 2 };
  const res = L.step(s, 'drop');
  assert.equal(s.toppedOut, true);
  assert.equal(res.done, true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(4);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'hold'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions give identical state', () => {
  const a = L.createState(19);
  const b = L.createState(19);
  for (const act of ['left', 'rotate', 'drop', 'right', 'drop']) {
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
