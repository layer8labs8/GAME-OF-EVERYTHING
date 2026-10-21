(function (root) {
  const W = 360;
  const H = 640;

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
      rand: mulberry32(seed),
      player: { x: W / 2, y: H - 80, r: 14, speed: 420 },
      rocks: [],
      score: 0,
      time: 0,
      spawnIn: 0.6,
      over: false,
    };
  }

  function step(s, dt, targetX) {
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
      const r = 10 + s.rand() * 16;
      s.rocks.push({
        x: r + s.rand() * (s.w - 2 * r),
        y: -r,
        r,
        vy: fallSpeed(s.time) * (0.8 + s.rand() * 0.5),
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

  const api = { W, H, createState, step, spawnInterval, fallSpeed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
