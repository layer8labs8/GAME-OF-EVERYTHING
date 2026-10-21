const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('./www/logic.js');

const one = [[0, 0]];

function firstFit(s, slot) {
  const cells = G.SHAPES[s.tray[slot].shape];
  for (let r = 0; r < G.N; r++) {
    for (let c = 0; c < G.N; c++) {
      if (G.canPlace(s.board, cells, r, c)) return [r, c];
    }
  }
  return null;
}

function withSingle(s, slot) {
  s.tray[slot] = { shape: 0, color: 1 };
}

test('every shape is normalised and fits a 5x5 box', () => {
  assert.deepEqual(G.SHAPES[0], one);
  for (const cells of G.SHAPES) {
    assert.equal(Math.min(...cells.map((x) => x[0])), 0);
    assert.equal(Math.min(...cells.map((x) => x[1])), 0);
    assert.equal(new Set(cells.map((x) => x.join(','))).size, cells.length);
    const { h, w } = G.bounds(cells);
    assert.ok(h <= 5 && w <= 5);
  }
});

test('canPlace respects borders and filled cells', () => {
  const b = G.createBoard();
  const two = [[0, 0], [0, 1]];
  assert.equal(G.canPlace(b, two, 0, 6), true);
  assert.equal(G.canPlace(b, two, 0, 7), false);
  assert.equal(G.canPlace(b, two, -1, 0), false);
  b[0][1] = 3;
  assert.equal(G.canPlace(b, two, 0, 0), false);
});

test('placing fills cells, scores them and uses the tray slot', () => {
  const s = G.createState(1);
  withSingle(s, 0);
  const res = G.place(s, 0, 4, 4);
  assert.equal(res.ok, true);
  assert.equal(s.board[4][4], 1);
  assert.equal(s.score, 1);
  assert.equal(s.tray[0], null);
});

test('placing on a bad spot or empty slot changes nothing', () => {
  const s = G.createState(1);
  withSingle(s, 0);
  s.board[2][2] = 5;
  assert.equal(G.place(s, 0, 2, 2).ok, false);
  assert.equal(s.score, 0);
  assert.ok(s.tray[0]);
  s.tray[1] = null;
  assert.equal(G.place(s, 1, 0, 0).ok, false);
});

test('a full row and a full column clear together', () => {
  const s = G.createState(1);
  for (let i = 0; i < G.N; i++) {
    if (i !== 3) {
      s.board[3][i] = 2;
      s.board[i][3] = 2;
    }
  }
  withSingle(s, 0);
  const res = G.place(s, 0, 3, 3);
  assert.equal(res.cleared, 2);
  assert.equal(res.gain, 41);
  for (let i = 0; i < G.N; i++) {
    assert.equal(s.board[3][i], 0);
    assert.equal(s.board[i][3], 0);
  }
});

test('combo grows on consecutive clears and resets without one', () => {
  const s = G.createState(1);
  for (let c = 0; c < 7; c++) s.board[0][c] = 2;
  withSingle(s, 0);
  assert.equal(G.place(s, 0, 0, 7).cleared, 1);
  assert.equal(s.combo, 1);

  for (let c = 0; c < 7; c++) s.board[1][c] = 2;
  withSingle(s, 1);
  const second = G.place(s, 1, 1, 7);
  assert.equal(s.combo, 2);
  assert.equal(second.gain, 1 + 10 + 10);

  withSingle(s, 2);
  G.place(s, 2, 5, 5);
  assert.equal(s.combo, 0);
});

test('the tray refills after all three pieces are used', () => {
  const s = G.createState(3);
  for (let slot = 0; slot < 3; slot++) {
    const [r, c] = firstFit(s, slot);
    assert.equal(G.place(s, slot, r, c).ok, true);
  }
  assert.ok(s.tray.every(Boolean));
  assert.equal(s.over, false);
});

test('every new tray has a piece that fits, on many boards', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rand = (function (a) { return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })(seed);
    const b = G.createBoard();
    for (let r = 0; r < G.N; r++) for (let c = 0; c < G.N; c++) b[r][c] = rand() < 0.6 ? 1 : 0;
    b[0][0] = 0;
    const tray = G.drawTray(rand, b);
    assert.ok(tray.some((p) => G.fitsAnywhere(b, G.SHAPES[p.shape])), 'seed ' + seed);
  }
});

test('game ends when no remaining piece fits', () => {
  const s = G.createState(1);
  for (let r = 0; r < G.N; r++) for (let c = 0; c < G.N; c++) s.board[r][c] = (r + c) % 2 === 0 ? 1 : 0;
  s.tray = [{ shape: 0, color: 1 }, { shape: 9, color: 2 }, null];
  assert.equal(G.hasMove(s), true);
  const res = G.place(s, 0, 0, 1);
  assert.equal(res.ok, true);
  assert.equal(s.over, true);
  assert.equal(G.place(s, 1, 0, 0).ok, false);
});

test('same seed gives the same game', () => {
  const run = () => {
    const s = G.createState(11);
    for (let i = 0; i < 30 && !s.over; i++) {
      const slot = s.tray.findIndex(Boolean);
      const spot = firstFit(s, slot);
      if (!spot) break;
      G.place(s, slot, spot[0], spot[1]);
    }
    return { score: s.score, board: s.board };
  };
  assert.deepEqual(run(), run());
});
