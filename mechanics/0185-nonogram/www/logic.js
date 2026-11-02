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

  const N = 5;
  const MAX_STEPS = 300;
  const PICTURES = [
    ['.#.#.', '#####', '#####', '.###.', '..#..'],
    ['..#..', '.###.', '#####', '.#.#.', '.###.'],
    ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    ['..#..', '..##.', '..#..', '#####', '.###.'],
    ['..#..', '.###.', '#####', '..#..', '..#..'],
    ['..#..', '...#.', '#####', '...#.', '..#..'],
  ];

  function runs(line) {
    const out = [];
    let n = 0;
    for (const v of line) {
      if (v) n += 1;
      else if (n) { out.push(n); n = 0; }
    }
    if (n) out.push(n);
    return out;
  }

  function rowsOf(cells) {
    return Array.from({ length: N }, (_, r) => cells.slice(r * N, r * N + N));
  }

  function colsOf(cells) {
    return Array.from({ length: N }, (_, c) => Array.from({ length: N }, (__, r) => cells[r * N + c]));
  }

  function createState(seed) {
    const s = { clues: null, grid: Array(N * N).fill(0), picture: 0, won: false, steps: 0, rng: seed | 0 };
    s.picture = Math.floor(nextRandom(s) * PICTURES.length);
    const cells = PICTURES[s.picture].join('').split('').map((ch) => (ch === '#' ? 1 : 0));
    s.clues = { rows: rowsOf(cells).map(runs), cols: colsOf(cells).map(runs) };
    return s;
  }

  function matches(s) {
    return JSON.stringify({ rows: rowsOf(s.grid).map(runs), cols: colsOf(s.grid).map(runs) }) === JSON.stringify(s.clues);
  }

  function isOver(s) {
    return s.won || s.steps >= MAX_STEPS;
  }

  function legalActions(s) {
    return isOver(s) ? [] : Array.from({ length: N * N }, (_, i) => i);
  }

  function score(s) {
    return s.won ? Math.max(100, 1000 - s.steps * 10) : 0;
  }

  function step(s, action) {
    assertLegal(s, action);
    s.grid[action] = s.grid[action] ? 0 : 1;
    s.steps += 1;
    s.won = matches(s);
    return { reward: s.won ? score(s) : 0, done: isOver(s) };
  }

  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
