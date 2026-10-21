(function (root) {
  const N = 8;

  // Index 0 must stay the single cell: drawTray falls back to it.
  const SHAPES = [
    [[0, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 0]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 1], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
    [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]],
    [[0, 0], [0, 1], [0, 2], [1, 1]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 1], [1, 0], [1, 1], [2, 0]],
    [[0, 0], [1, 0], [2, 0], [2, 1]],
    [[0, 1], [1, 1], [2, 0], [2, 1]],
  ];

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createBoard() {
    return Array.from({ length: N }, () => Array(N).fill(0));
  }

  function bounds(cells) {
    let h = 0;
    let w = 0;
    for (const [r, c] of cells) {
      h = Math.max(h, r + 1);
      w = Math.max(w, c + 1);
    }
    return { h, w };
  }

  function canPlace(board, cells, r, c) {
    return cells.every(([dr, dc]) => {
      const rr = r + dr;
      const cc = c + dc;
      return rr >= 0 && rr < N && cc >= 0 && cc < N && board[rr][cc] === 0;
    });
  }

  function fitsAnywhere(board, cells) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (canPlace(board, cells, r, c)) return true;
      }
    }
    return false;
  }

  function randomPiece(rand) {
    return { shape: Math.floor(rand() * SHAPES.length), color: 1 + Math.floor(rand() * 6) };
  }

  function drawTray(rand, board) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const tray = [randomPiece(rand), randomPiece(rand), randomPiece(rand)];
      if (tray.some((p) => fitsAnywhere(board, SHAPES[p.shape]))) return tray;
    }
    const tray = [randomPiece(rand), randomPiece(rand), randomPiece(rand)];
    tray[0] = { shape: 0, color: tray[0].color };
    return tray;
  }

  function createState(seed) {
    const rand = mulberry32(seed);
    const board = createBoard();
    return { board, tray: drawTray(rand, board), score: 0, combo: 0, over: false, rand };
  }

  function hasMove(s) {
    return s.tray.some((p) => p && fitsAnywhere(s.board, SHAPES[p.shape]));
  }

  function place(s, slot, r, c) {
    const piece = s.tray[slot];
    if (s.over || !piece) return { ok: false };
    const cells = SHAPES[piece.shape];
    if (!canPlace(s.board, cells, r, c)) return { ok: false };

    for (const [dr, dc] of cells) s.board[r + dr][c + dc] = piece.color;

    const rows = [];
    const cols = [];
    for (let i = 0; i < N; i++) {
      if (s.board[i].every((v) => v !== 0)) rows.push(i);
      if (s.board.every((row) => row[i] !== 0)) cols.push(i);
    }
    for (const i of rows) for (let j = 0; j < N; j++) s.board[i][j] = 0;
    for (const j of cols) for (let i = 0; i < N; i++) s.board[i][j] = 0;

    const cleared = rows.length + cols.length;
    let gain = cells.length;
    if (cleared > 0) {
      s.combo += 1;
      gain += 10 * cleared * cleared + (s.combo - 1) * 10;
    } else {
      s.combo = 0;
    }
    s.score += gain;

    s.tray[slot] = null;
    if (s.tray.every((p) => p === null)) s.tray = drawTray(s.rand, s.board);
    s.over = !hasMove(s);
    return { ok: true, cleared, gain, rows, cols };
  }

  const api = { N, SHAPES, createBoard, bounds, canPlace, fitsAnywhere, drawTray, createState, hasMove, place };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BlockLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
