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

  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  function createState(seed) {
    return { board: Array(9).fill(0), winner: null, steps: 0, rng: seed | 0 };
  }

  function lineOwner(b) {
    for (const [x, y, z] of LINES) if (b[x] && b[x] === b[y] && b[y] === b[z]) return b[x];
    return 0;
  }

  function isOver(s) {
    return s.winner !== null;
  }

  function legalActions(s) {
    if (isOver(s)) return [];
    return s.board.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  }

  function settle(s) {
    const owner = lineOwner(s.board);
    if (owner === 1) s.winner = 'player';
    else if (owner === 2) s.winner = 'computer';
    else if (s.board.every(Boolean)) s.winner = 'draw';
  }

  function winningCell(b, who) {
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = who;
      const won = lineOwner(b) === who;
      b[i] = 0;
      if (won) return i;
    }
    return -1;
  }

  function computerMove(s) {
    let cell = winningCell(s.board, 2);
    if (cell < 0) cell = winningCell(s.board, 1);
    if (cell < 0 && s.board[4] === 0) cell = 4;
    if (cell < 0) {
      const free = legalActions(s);
      cell = free[Math.floor(nextRandom(s) * free.length)];
    }
    s.board[cell] = 2;
  }

  function score(s) {
    return s.winner === 'player' ? 100 : s.winner === 'draw' ? 50 : 0;
  }

  function step(s, action) {
    assertLegal(s, action);
    s.board[action] = 1;
    s.steps += 1;
    settle(s);
    if (!isOver(s)) {
      computerMove(s);
      settle(s);
    }
    return { reward: isOver(s) ? score(s) : 0, done: isOver(s) };
  }

  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
