(function (root) {
  const W = 360;
  const H = 640;
  const TICK = 1 / 30; // one bot action
  const MAX_TICKS = 2000; // bots stop here; people play until they are hit

  function nextRandom(s) {
    s.rng = (s.rng + 0x6d2b79f5) | 0;
    let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnInterval(time) {
    return Math.max(0.25, 0.8 - time * 0.01);
  }

  function fallSpeed(time) {
    return Math.min(420, 160 + time * 4);
  }

  function createState(seed) {
    return {
      w: W,
      h: H,
      rng: seed | 0,
      player: { x: W / 2, y: H - 80, r: 14, speed: 420 },
      rocks: [],
      score: 0,
      time: 0,
      spawnIn: 0.6,
      ticks: 0,
      over: false,
    };
  }

  function advance(s, dt, targetX) {
    if (s.over) return s;
    s.time += dt;
    s.score = Math.floor(s.time * 10);

    const p = s.player;
    const dx = targetX - p.x;
    const maxMove = p.speed * dt;
    p.x += Math.abs(dx) <= maxMove ? dx : Math.sign(dx) * maxMove;
    p.x = Math.min(s.w - p.r, Math.max(p.r, p.x));

    s.spawnIn -= dt;
    while (s.spawnIn <= 0) {
      const r = 10 + nextRandom(s) * 16;
      s.rocks.push({
        x: r + nextRandom(s) * (s.w - 2 * r),
        y: -r,
        r,
        vy: fallSpeed(s.time) * (0.8 + nextRandom(s) * 0.5),
      });
      s.spawnIn += spawnInterval(s.time);
    }

    for (const k of s.rocks) {
      k.y += k.vy * dt;
      const ddx = k.x - p.x;
      const ddy = k.y - p.y;
      const rr = k.r + p.r * 0.8;
      if (ddx * ddx + ddy * ddy < rr * rr) s.over = true;
    }
    s.rocks = s.rocks.filter((k) => k.y - k.r < s.h);
    return s;
  }

  function isOver(s) {
    return s.over;
  }

  function legalActions(s) {
    return s.over ? [] : ['left', 'right', 'stay'];
  }

  function score(s) {
    return s.score;
  }

  function step(s, action) {
    if (!legalActions(s).includes(action)) throw new Error(`illegal action: ${JSON.stringify(action)}`);
    const before = s.score;
    const target = action === 'left' ? 0 : action === 'right' ? W : s.player.x;
    advance(s, TICK, target);
    s.ticks += 1;
    if (s.ticks >= MAX_TICKS) s.over = true;
    return { reward: s.score - before, done: s.over };
  }

  const api = { W, H, TICK, MAX_TICKS, createState, advance, spawnInterval, fallSpeed, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
