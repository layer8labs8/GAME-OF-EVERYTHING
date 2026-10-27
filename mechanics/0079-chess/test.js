const test = require('node:test');
const assert = require('node:assert/strict');
const chess = require('./www/logic.js');

test('createState initializes standard 8x8 chessboard and 32 pieces', () => {
  const s = chess.createState(42);
  assert.equal(s.board.length, 8);
  assert.equal(s.board[0].length, 8);
  assert.equal(s.stepCount, 0);
  assert.equal(s.gameOver, false);
  assert.equal(s.castling.wK, true);
  assert.equal(s.castling.wQ, true);
  assert.equal(s.castling.bK, true);
  assert.equal(s.castling.bQ, true);

  // Check initial piece placement
  assert.equal(s.board[7][4], 'wK'); // White King at e1
  assert.equal(s.board[7][3], 'wQ'); // White Queen at d1
  assert.equal(s.board[0][4], 'bK'); // Black King at e8
  assert.equal(s.board[0][3], 'bQ'); // Black Queen at d8
  assert.equal(s.board[6][4], 'wP'); // White pawn at e2
  assert.equal(s.board[1][4], 'bP'); // Black pawn at e7
});

test('legalActions contains all standard 20 opening moves for White', () => {
  const s = chess.createState(100);
  const actions = chess.legalActions(s);
  // In chess, 8 pawns * 2 moves (1 or 2 steps) = 16 moves + 2 knights * 2 moves = 4 moves => exactly 20 moves!
  assert.equal(actions.length, 20);
  assert.ok(actions.includes('e2-e4'));
  assert.ok(actions.includes('e2-e3'));
  assert.ok(actions.includes('d2-d4'));
  assert.ok(actions.includes('g1-f3'));
  assert.ok(actions.includes('b1-c3'));
});

test('pawn step e2-e4 executes and triggers AI countermove', () => {
  const s = chess.createState(777);
  const res = chess.step(s, 'e2-e4');
  assert.equal(s.board[6][4], null); // e2 is now empty
  assert.equal(s.board[4][4], 'wP'); // e4 has White pawn
  assert.equal(s.stepCount, 1);
  assert.ok(s.stats.movesHistory.length >= 2); // Player move + AI countermove
  assert.equal(typeof res.reward, 'number');
});

test('capturing an opponent piece increases score and logs capture', () => {
  const s = chess.createState(123);
  // Clear board and set up simple capture: White Rook at e1, Black Knight at e5
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      s.board[r][c] = null;
    }
  }
  s.board[7][4] = 'wK'; // e1
  s.board[7][0] = 'wR'; // a1
  s.board[3][0] = 'bN'; // a5
  s.board[0][4] = 'bK'; // e8
  s.castling = { wK: false, wQ: false, bK: false, bQ: false };

  const initialScore = chess.score(s);
  const res = chess.step(s, 'a1-a5');
  assert.ok(res.reward > 1);
  assert.ok(chess.score(s) > initialScore);
  assert.ok(s.stats.whiteCaptures.includes('bN'));
});

test('castling moves both King and Rook correctly', () => {
  const s = chess.createState(999);
  // Clear intermediate squares between e1 and h1
  s.board[7][5] = null; // f1
  s.board[7][6] = null; // g1
  s.castling.wK = true;

  const legal = chess.legalActions(s);
  assert.ok(legal.includes('e1-g1'));

  chess.step(s, 'e1-g1');
  assert.equal(s.board[7][4], null); // e1 empty
  assert.equal(s.board[7][6], 'wK'); // g1 White King
  assert.equal(s.board[7][5], 'wR'); // f1 White Rook
  assert.equal(s.board[7][7], null); // h1 empty
  assert.equal(s.castling.wK, false);
});

test('pawn promotion to Queen on back rank', () => {
  const s = chess.createState(888);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      s.board[r][c] = null;
    }
  }
  s.board[7][7] = 'wK';
  s.board[0][0] = 'bK';
  s.board[1][3] = 'wP'; // d7
  s.castling = { wK: false, wQ: false, bK: false, bQ: false };

  const legal = chess.legalActions(s);
  assert.ok(legal.includes('d7-d8=Q'));

  chess.step(s, 'd7-d8=Q');
  assert.equal(s.board[1][3], null);
  // White queen should now be at d8 (or AI captured it if possible, but bK is at a8)
  assert.equal(s.board[0][3], 'wQ');
});

test('checkmate ends game with victory for White', () => {
  const s = chess.createState(555);
  // Set up Scholar's Mate position:
  // White Queen at f7 delivers mate to Black King at e8 with Bishop supporting at c4
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      s.board[r][c] = null;
    }
  }
  s.board[7][4] = 'wK'; // e1
  s.board[4][2] = 'wB'; // c4
  s.board[5][5] = 'wQ'; // f3
  s.board[0][4] = 'bK'; // e8
  s.board[0][3] = 'bQ'; // d8
  s.board[0][5] = 'bB'; // f8
  s.board[1][4] = 'bP'; // e7
  s.board[1][3] = 'bP'; // d7
  s.castling = { wK: false, wQ: false, bK: false, bQ: false };

  const res = chess.step(s, 'f3-f7');
  assert.equal(res.done, true);
  assert.equal(s.gameOver, true);
  assert.equal(s.winner, 'w');
  assert.ok(res.reward >= 200);
});

test('cannot move into check or ignore check', () => {
  const s = chess.createState(444);
  // Pin White Knight at e2 between King at e1 and Black Rook at e8
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      s.board[r][c] = null;
    }
  }
  s.board[7][4] = 'wK'; // e1
  s.board[6][4] = 'wN'; // e2
  s.board[0][4] = 'bR'; // e8
  s.board[0][0] = 'bK'; // a8
  s.castling = { wK: false, wQ: false, bK: false, bQ: false };

  const legal = chess.legalActions(s);
  // White knight cannot move because it is absolute-pinned to the king
  const knightMoves = legal.filter((m) => m.startsWith('e2-'));
  assert.equal(knightMoves.length, 0);
});

test('illegal move throws error without mutating state', () => {
  const s = chess.createState(111);
  const snap = JSON.stringify(s);
  assert.throws(() => {
    chess.step(s, 'e2-e5'); // Illegal: pawn cannot jump 3 squares
  });
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and action sequence produces strictly deterministic state', () => {
  const s1 = chess.createState(333);
  const s2 = chess.createState(333);

  chess.step(s1, 'e2-e4');
  chess.step(s2, 'e2-e4');

  assert.deepEqual(s1, s2);
});
