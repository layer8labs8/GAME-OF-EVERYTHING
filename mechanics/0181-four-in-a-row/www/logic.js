(function (root) {
  function nextRandom(s) {
    s.rng = (s.rng + 0x6d2b79f5) | 0;
    let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function assertLegal(s, action) {
    if (!legalActions(s).includes(action)) throw new Error('illegal action: ' + JSON.stringify(action));
  }

  const COLS = 7;
  const ROWS = 6;

  function createState(seed) {
    return { board: Array(COLS * ROWS).fill(0), winner: null, steps: 0, rng: seed | 0 };
  }

  function dropRow(b, c) {
    for (let r = ROWS - 1; r >= 0; r--) if (b[r * COLS + c] === 0) return r;
    return -1;
  }

  function makesFour(b, r, c, who) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      let run = 1;
      for (const sign of [1, -1]) {
        let rr = r + dr * sign;
        let cc = c + dc * sign;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr * COLS + cc] === who) {
          run += 1;
          rr += dr * sign;
          cc += dc * sign;
        }
      }
      if (run >= 4) return true;
    }
    return false;
  }

  function isOver(s) {
    return s.winner !== null;
  }

  function legalActions(s) {
    if (isOver(s)) return [];
    const cols = [];
    for (let c = 0; c < COLS; c++) if (s.board[c] === 0) cols.push(c);
    return cols;
  }

  function drop(s, c, who) {
    const r = dropRow(s.board, c);
    s.board[r * COLS + c] = who;
    if (makesFour(s.board, r, c, who)) s.winner = who === 1 ? 'player' : 'computer';
    else if (s.board.every(Boolean)) s.winner = 'draw';
  }

  function winningColumn(s, who) {
    for (const c of legalActions(s)) {
      if (makesFour(s.board, dropRow(s.board, c), c, who)) return c;
    }
    return -1;
  }

  function computerMove(s) {
    let c = winningColumn(s, 2);
    if (c < 0) c = winningColumn(s, 1);
    if (c < 0) {
      const free = legalActions(s).sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
      c = free[Math.min(free.length - 1, Math.floor(nextRandom(s) * 3))];
    }
    drop(s, c, 2);
  }

  function score(s) {
    return s.winner === 'player' ? 100 : s.winner === 'draw' ? 50 : 0;
  }

  function step(s, action) {
    assertLegal(s, action);
    s.steps += 1;
    drop(s, action, 1);
    if (!isOver(s)) computerMove(s);
    return { reward: isOver(s) ? score(s) : 0, done: isOver(s) };
  }

  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
