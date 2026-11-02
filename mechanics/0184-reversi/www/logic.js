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

  const N = 8;
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const CORNERS = [0, 7, 56, 63];

  function createState(seed) {
    const board = Array(N * N).fill(0);
    board[27] = 2;
    board[28] = 1;
    board[35] = 1;
    board[36] = 2;
    return { board, over: false, steps: 0, rng: seed | 0 };
  }

  function flips(b, pos, who) {
    if (b[pos] !== 0) return [];
    const other = who === 1 ? 2 : 1;
    const out = [];
    const r0 = Math.floor(pos / N);
    const c0 = pos % N;
    for (const [dr, dc] of DIRS) {
      const line = [];
      let r = r0 + dr;
      let c = c0 + dc;
      while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === other) {
        line.push(r * N + c);
        r += dr;
        c += dc;
      }
      if (line.length && r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === who) out.push(...line);
    }
    return out;
  }

  function moves(b, who) {
    const list = [];
    for (let i = 0; i < N * N; i++) if (flips(b, i, who).length) list.push(i);
    return list;
  }

  function play(b, pos, who) {
    const taken = flips(b, pos, who);
    b[pos] = who;
    for (const i of taken) b[i] = who;
  }

  function isOver(s) {
    return s.over;
  }

  function legalActions(s) {
    return s.over ? [] : moves(s.board, 1);
  }

  function computerTurns(s) {
    for (;;) {
      const options = moves(s.board, 2);
      if (options.length) {
        const corner = options.find((m) => CORNERS.includes(m));
        const ranked = options.map((m) => ({ m, n: flips(s.board, m, 2).length, tie: nextRandom(s) }));
        ranked.sort((a, b) => b.n - a.n || a.tie - b.tie);
        play(s.board, corner !== undefined ? corner : ranked[0].m, 2);
      }
      if (moves(s.board, 1).length) return;
      if (!moves(s.board, 2).length) {
        s.over = true;
        return;
      }
    }
  }

  function score(s) {
    return s.board.filter((v) => v === 1).length;
  }

  function step(s, action) {
    assertLegal(s, action);
    const before = score(s);
    s.steps += 1;
    play(s.board, action, 1);
    computerTurns(s);
    return { reward: score(s) - before, done: s.over };
  }

  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
