const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes 12 player pieces and 12 AI pieces on 8x8 board', () => {
  const s = createState(555);
  assert.equal(s.playerPieces, 12);
  assert.equal(s.aiPieces, 12);
  assert.equal(s.board.length, 8);
  assert.equal(s.board[0].length, 8);
  assert.equal(isOver(s), false);
});

test('legalActions returns opening diagonal forward moves for player', () => {
  const s = createState(555);
  const moves = legalActions(s);
  assert.ok(moves.length > 0);
  assert.ok(moves.every((m) => m.startsWith('5,')));
});

test('mandatory capture enforces jump moves when available', () => {
  const s = createState(555);
  // Clear board and place 1 player piece and 1 AI piece in jump position
  s.board = Array.from({ length: 8 }, () => new Array(8).fill(0));
  s.board[4][3] = 1;  // Player at 4,3
  s.board[3][4] = -1; // AI at 3,4
  s.playerPieces = 1;
  s.aiPieces = 1;

  const moves = legalActions(s);
  assert.equal(moves.length, 1);
  assert.equal(moves[0], '4,3->2,5'); // Jump over 3,4 to 2,5
});

test('executing a jump removes opponent piece and updates captures', () => {
  const s = createState(555);
  s.board = Array.from({ length: 8 }, () => new Array(8).fill(0));
  s.board[4][3] = 1;
  s.board[3][4] = -1;
  s.playerPieces = 1;
  s.aiPieces = 1;

  const res = step(s, '4,3->2,5');
  assert.equal(s.board[3][4], 0); // Opponent captured
  assert.equal(s.board[2][5], 1); // Landed
  assert.equal(s.aiPieces, 0);
  assert.equal(s.won, true);
  assert.equal(res.done, true);
});

test('reaching row 0 crowns player piece to King', () => {
  const s = createState(555);
  s.board = Array.from({ length: 8 }, () => new Array(8).fill(0));
  s.board[1][2] = 1; // Player 1 step away from back rank
  s.board[0][5] = -1; // AI piece elsewhere so game doesn't end immediately
  s.playerPieces = 1;
  s.aiPieces = 1;

  step(s, '1,2->0,1');
  assert.equal(s.board[0][1], 2); // Crowned King
});

test('King piece can move backwards diagonally', () => {
  const s = createState(555);
  s.board = Array.from({ length: 8 }, () => new Array(8).fill(0));
  s.board[2][3] = 2; // Player King
  s.board[0][5] = -1;
  s.playerPieces = 1;
  s.aiPieces = 1;

  const moves = legalActions(s);
  assert.ok(moves.includes('2,3->3,2') || moves.includes('2,3->3,4')); // Backwards moves
});

test('illegal move throws without mutating state', () => {
  const s = createState(555);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, '0,0->1,1'); // Illegal start position
  });

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(7771);
  const s2 = createState(7771);

  for (let i = 0; i < 20; i++) {
    const a1 = legalActions(s1);
    const a2 = legalActions(s2);
    assert.deepEqual(a1, a2);
    if (a1.length === 0) break;

    const chosen = a1[i % a1.length];
    step(s1, chosen);
    step(s2, chosen);
    assert.deepEqual(s1, s2);
  }
});
