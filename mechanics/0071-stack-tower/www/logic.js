(function (root) {
  const TRACK_W = 280;
  const BASE_W = 120;
  const PERFECT_TOL = 4;
  const MIN_WIDTH = 4;
  const MAX_IDLE = 120;
  const MAX_STEPS = 2400;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function spawnMover(state, w) {
    const fromLeft = nextRandom(state) < 0.5;
    const speed = round2(Math.min(8.5, 2.8 + state.tower.length * 0.14));
    state.mover = {
      x: fromLeft ? 0 : round2(TRACK_W - w),
      w,
      dir: fromLeft ? 1 : -1,
      speed,
      idleTicks: 0,
    };
  }

  function createState(seed) {
    const state = {
      tower: [{ x: (TRACK_W - BASE_W) / 2, w: BASE_W, colorIdx: 0 }],
      mover: null,
      height: 0,
      streak: 0,
      points: 0,
      lastDrop: 'none',
      over: false,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    spawnMover(state, BASE_W);
    return state;
  }

  function isOver(state) {
    return Boolean(state.over || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ['wait', 'drop'];
  }

  function resolveDrop(state) {
    const m = state.mover;
    const top = state.tower[state.tower.length - 1];

    if (Math.abs(m.x - top.x) <= PERFECT_TOL) {
      state.streak += 1;
      let newW = top.w;
      let newX = top.x;
      if (state.streak >= 5 && newW < BASE_W) {
        newW = Math.min(BASE_W, round2(newW + 6));
        newX = round2(Math.max(0, Math.min(TRACK_W - newW, newX - 3)));
      }
      const gain = 20 + state.streak * 5;
      state.tower.push({ x: newX, w: newW, colorIdx: state.tower.length % 8 });
      state.height = state.tower.length - 1;
      state.points += gain;
      state.lastDrop = 'perfect';
      if (state.stepCount >= MAX_STEPS) state.over = true;
      else spawnMover(state, newW);
      return { reward: gain, done: isOver(state) };
    }

    const left = Math.max(m.x, top.x);
    const right = Math.min(m.x + m.w, top.x + top.w);
    const overlap = right - left;

    if (overlap < MIN_WIDTH) {
      state.over = true;
      state.lastDrop = 'miss';
      return { reward: -15, done: true };
    }

    const newX = round2(left);
    const newW = round2(overlap);
    state.streak = 0;
    state.tower.push({ x: newX, w: newW, colorIdx: state.tower.length % 8 });
    state.height = state.tower.length - 1;
    state.points += 10;
    state.lastDrop = 'trimmed';
    if (state.stepCount >= MAX_STEPS) state.over = true;
    else spawnMover(state, newW);
    return { reward: 10, done: isOver(state) };
  }

  function step(state, action) {
    if (isOver(state) || (action !== 'wait' && action !== 'drop')) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;

    if (action === 'drop') {
      return resolveDrop(state);
    }

    const m = state.mover;
    const maxX = TRACK_W - m.w;
    let nx = m.x + m.dir * m.speed;
    if (nx <= 0) {
      nx = -nx;
      m.dir = 1;
    } else if (nx >= maxX) {
      nx = 2 * maxX - nx;
      m.dir = -1;
    }
    m.x = round2(Math.max(0, Math.min(maxX, nx)));
    m.idleTicks += 1;

    if (m.idleTicks >= MAX_IDLE) {
      return resolveDrop(state);
    }

    if (state.stepCount >= MAX_STEPS) {
      state.over = true;
    }
    return { reward: 0, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { TRACK_W, BASE_W, PERFECT_TOL, MIN_WIDTH, MAX_IDLE, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
