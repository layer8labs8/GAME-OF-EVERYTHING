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

  const N = 7;
  const STARTS = [24, 17, 23, 25, 31];

  function onBoard(r, c) {
    return r >= 0 && r < N && c >= 0 && c < N && ((r >= 2 && r <= 4) || (c >= 2 && c <= 4));
  }

  function createState(seed) {
    const s = { board: [], pegs: 32, steps: 0, rng: seed | 0 };
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) s.board.push(onBoard(r, c) ? 1 : -1);
    s.board[STARTS[Math.floor(nextRandom(s) * STARTS.length)]] = 0;
    return s;
  }

  function legalActions(s) {
    const jumps = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (s.board[r * N + c] !== 1) continue;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const tr = r + dr * 2;
          const tc = c + dc * 2;
          if (onBoard(tr, tc) && s.board[(r + dr) * N + c + dc] === 1 && s.board[tr * N + tc] === 0) {
            jumps.push((r * N + c) + ':' + (tr * N + tc));
          }
        }
      }
    }
    return jumps;
  }

  function isOver(s) {
    return legalActions(s).length === 0;
  }

  function score(s) {
    return (32 - s.pegs) * 10 + (s.pegs === 1 ? 200 : 0);
  }

  function step(s, action) {
    assertLegal(s, action);
    const before = score(s);
    const [from, to] = action.split(':').map(Number);
    s.board[from] = 0;
    s.board[(from + to) / 2] = 0;
    s.board[to] = 1;
    s.pegs -= 1;
    s.steps += 1;
    return { reward: score(s) - before, done: isOver(s) };
  }

  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
