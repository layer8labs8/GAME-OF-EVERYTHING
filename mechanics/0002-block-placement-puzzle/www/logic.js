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

  const MAX_BOT_MOVES = 2000; // bots stop here; people play until the board is stuck

  // Random numbers come from an integer in the state, so the state stays plain JSON.
  function randomFor(s) {
    return () => {
      s.rng = (s.rng + 0x6d2b79f5) | 0;
      let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
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
    const s = { board: createBoard(), tray: [], score: 0, combo: 0, moves: 0, over: false, rng: seed | 0 };
    s.tray = drawTray(randomFor(s), s.board);
    return s;
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
    if (s.tray.every((p) => p === null)) s.tray = drawTray(randomFor(s), s.board);
    s.over = !hasMove(s);
    return { ok: true, cleared, gain, rows, cols };
  }

  function isOver(s) {
    return s.over;
  }

  function legalActions(s) {
    if (s.over) return [];
    const actions = [];
    s.tray.forEach((piece, slot) => {
      if (!piece) return;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (canPlace(s.board, SHAPES[piece.shape], r, c)) actions.push(`${slot}:${r}:${c}`);
        }
      }
    });
    return actions;
  }

  function step(s, action) {
    if (!legalActions(s).includes(action)) throw new Error(`illegal action: ${JSON.stringify(action)}`);
    const [slot, r, c] = action.split(':').map(Number);
    const { gain } = place(s, slot, r, c);
    s.moves += 1;
    if (s.moves >= MAX_BOT_MOVES) s.over = true;
    return { reward: gain, done: s.over };
  }

  function score(s) {
    return s.score;
  }

  const api = { N, SHAPES, createBoard, bounds, canPlace, fitsAnywhere, drawTray, createState, hasMove, place, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BlockLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
