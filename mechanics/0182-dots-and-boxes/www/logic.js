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

  const N = 4;

  function createState(seed) {
    return { h: Array((N + 1) * N).fill(0), v: Array(N * (N + 1)).fill(0), owner: Array(N * N).fill(0), player: 0, computer: 0, steps: 0, rng: seed | 0 };
  }

  function sides(s, r, c) {
    return s.h[r * N + c] + s.h[(r + 1) * N + c] + s.v[r * (N + 1) + c] + s.v[r * (N + 1) + c + 1];
  }

  function isOver(s) {
    return s.owner.every(Boolean);
  }

  function legalActions(s) {
    if (isOver(s)) return [];
    const lines = [];
    s.h.forEach((on, i) => { if (!on) lines.push('h:' + Math.floor(i / N) + ':' + (i % N)); });
    s.v.forEach((on, i) => { if (!on) lines.push('v:' + Math.floor(i / (N + 1)) + ':' + (i % (N + 1))); });
    return lines;
  }

  function draw(s, line, who) {
    const [kind, r, c] = line.split(':');
    if (kind === 'h') s.h[Number(r) * N + Number(c)] = 1;
    else s.v[Number(r) * (N + 1) + Number(c)] = 1;
    let claimed = 0;
    for (let br = 0; br < N; br++) {
      for (let bc = 0; bc < N; bc++) {
        if (s.owner[br * N + bc] === 0 && sides(s, br, bc) === 4) {
          s.owner[br * N + bc] = who;
          claimed += 1;
        }
      }
    }
    if (who === 1) s.player += claimed;
    else s.computer += claimed;
    return claimed;
  }

  // Number of boxes a line would close, and whether it would leave a box with three sides.
  function preview(s, line) {
    const copy = JSON.parse(JSON.stringify(s));
    const closes = draw(copy, line, 2);
    let risky = false;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) if (copy.owner[r * N + c] === 0 && sides(copy, r, c) === 3) risky = true;
    }
    return { closes, risky };
  }

  function computerTurn(s) {
    while (!isOver(s)) {
      const lines = legalActions(s);
      const looks = lines.map((line) => ({ line, ...preview(s, line) }));
      const closing = looks.filter((l) => l.closes > 0);
      const safe = looks.filter((l) => !l.risky);
      const pool = closing.length ? closing : safe.length ? safe : looks;
      const choice = pool[Math.floor(nextRandom(s) * pool.length)];
      if (draw(s, choice.line, 2) === 0) return;
    }
  }

  function score(s) {
    return s.player * 10;
  }

  function step(s, action) {
    assertLegal(s, action);
    s.steps += 1;
    const claimed = draw(s, action, 1);
    if (claimed === 0) computerTurn(s);
    return { reward: claimed * 10, done: isOver(s) };
  }

  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
