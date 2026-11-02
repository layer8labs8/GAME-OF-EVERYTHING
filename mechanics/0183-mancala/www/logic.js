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

  const MAX_STEPS = 400;

  function createState(seed) {
    const pits = Array(14).fill(4);
    pits[6] = 0;
    pits[13] = 0;
    return { pits, over: false, steps: 0, rng: seed | 0 };
  }

  function isOver(s) {
    return s.over;
  }

  function legalActions(s) {
    if (s.over) return [];
    return [0, 1, 2, 3, 4, 5].filter((i) => s.pits[i] > 0);
  }

  // Sow one bowl for one side. Returns true when the side moves again.
  function sow(pits, start, store) {
    const other = store === 6 ? 13 : 6;
    let seeds = pits[start];
    pits[start] = 0;
    let i = start;
    while (seeds > 0) {
      i = (i + 1) % 14;
      if (i === other) continue;
      pits[i] += 1;
      seeds -= 1;
    }
    if (i === store) return true;
    const own = store === 6 ? i < 6 : i > 6 && i < 13;
    const opposite = 12 - i;
    if (own && pits[i] === 1 && pits[opposite] > 0) {
      pits[store] += pits[i] + pits[opposite];
      pits[i] = 0;
      pits[opposite] = 0;
    }
    return false;
  }

  function settle(s) {
    const mine = s.pits.slice(0, 6).reduce((a, b) => a + b, 0);
    const theirs = s.pits.slice(7, 13).reduce((a, b) => a + b, 0);
    if (mine > 0 && theirs > 0 && s.steps < MAX_STEPS) return;
    for (let i = 0; i < 6; i++) {
      s.pits[6] += s.pits[i];
      s.pits[i] = 0;
      s.pits[13] += s.pits[i + 7];
      s.pits[i + 7] = 0;
    }
    s.over = true;
  }

  function computerTurn(s) {
    while (!s.over) {
      const options = [7, 8, 9, 10, 11, 12].filter((i) => s.pits[i] > 0).map((i) => {
        const copy = s.pits.slice();
        const again = sow(copy, i, 13);
        return { i, gain: copy[13] - s.pits[13] + (again ? 5 : 0), tie: nextRandom(s) };
      });
      if (!options.length) return;
      options.sort((a, b) => b.gain - a.gain || a.tie - b.tie);
      const again = sow(s.pits, options[0].i, 13);
      settle(s);
      if (!again) return;
    }
  }

  function score(s) {
    return s.pits[6];
  }

  function step(s, action) {
    assertLegal(s, action);
    const before = s.pits[6];
    s.steps += 1;
    const again = sow(s.pits, action, 6);
    settle(s);
    if (!again) computerTurn(s);
    return { reward: s.pits[6] - before, done: s.over };
  }

  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
