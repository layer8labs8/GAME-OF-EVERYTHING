(function (root) {
  const W = 312;
  const H = 440;
  const PADDLE_W = 68;
  const PADDLE_Y = 414;
  const PADDLE_SPEED = 9.5;
  const MAX_STEPS = 2200;
  const ACTIONS = ['L', 'S', 'R'];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function makeBricks() {
    const bricks = [];
    const bw = 35;
    const bh = 16;
    const gap = 3;
    const startX = (W - (8 * bw + 7 * gap)) / 2;
    const startY = 44;
    for (let row = 0; row < 5; row++) {
      const points = (5 - row) * 10;
      for (let col = 0; col < 8; col++) {
        bricks.push({
          row,
          col,
          x: startX + col * (bw + gap),
          y: startY + row * (bh + gap),
          w: bw,
          h: bh,
          points,
        });
      }
    }
    return bricks;
  }

  function serveBall(state) {
    const sign = nextRandom(state) < 0.5 ? -1 : 1;
    const speed = Math.min(8.5, 5.2 + (state.wave - 1) * 0.5);
    const vx = sign * (1.6 + nextRandom(state) * 1.6);
    const vy = -Math.sqrt(Math.max(12, speed * speed - vx * vx));
    state.ball = { x: state.paddleX, y: PADDLE_Y - 14, vx, vy, r: 6 };
  }

  function createState(seed) {
    const state = {
      w: W,
      h: H,
      paddleW: PADDLE_W,
      paddleX: W / 2,
      ball: { x: W / 2, y: PADDLE_Y - 14, vx: 2, vy: -5, r: 6 },
      bricks: makeBricks(),
      lives: 3,
      wave: 1,
      points: 0,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    serveBall(state);
    return state;
  }

  function isOver(state) {
    return Boolean(state.lives <= 0 || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ACTIONS.slice();
  }

  function step(state, action) {
    if (isOver(state) || !ACTIONS.includes(action)) throw new Error('Illegal action');

    const half = state.paddleW / 2;
    if (action === 'L') state.paddleX = clamp(state.paddleX - PADDLE_SPEED, half, W - half);
    else if (action === 'R') state.paddleX = clamp(state.paddleX + PADDLE_SPEED, half, W - half);

    const b = state.ball;
    b.x += b.vx;
    b.y += b.vy;

    if (b.x - b.r < 0) {
      b.x = b.r;
      b.vx = Math.abs(b.vx);
    } else if (b.x + b.r > W) {
      b.x = W - b.r;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y - b.r < 0) {
      b.y = b.r;
      b.vy = Math.abs(b.vy);
    }

    let reward = 0;

    if (b.vy > 0 && b.y + b.r >= PADDLE_Y - 6 && b.y - b.r <= PADDLE_Y + 6 && Math.abs(b.x - state.paddleX) <= half + b.r) {
      b.y = PADDLE_Y - 6 - b.r;
      const offset = clamp((b.x - state.paddleX) / half, -1, 1);
      const speed = Math.hypot(b.vx, b.vy);
      const rawVx = offset * speed * 0.78;
      b.vx = Math.abs(rawVx) < 1.1 ? (rawVx >= 0 ? 1.1 : -1.1) : rawVx;
      b.vy = -Math.sqrt(Math.max(12, speed * speed - b.vx * b.vx));
    }

    for (let i = 0; i < state.bricks.length; i++) {
      const br = state.bricks[i];
      const cx = clamp(b.x, br.x, br.x + br.w);
      const cy = clamp(b.y, br.y, br.y + br.h);
      const dx = b.x - cx;
      const dy = b.y - cy;
      if (dx * dx + dy * dy <= b.r * b.r) {
        state.bricks.splice(i, 1);
        state.points += br.points;
        reward += br.points;
        if (Math.abs(dx) > Math.abs(dy)) b.vx = -b.vx;
        else b.vy = -b.vy;
        break;
      }
    }

    if (state.bricks.length === 0) {
      state.wave += 1;
      state.points += 100;
      reward += 100;
      state.bricks = makeBricks();
      serveBall(state);
    } else if (b.y - b.r > H) {
      state.lives -= 1;
      reward -= 15;
      if (state.lives > 0) serveBall(state);
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { W, H, PADDLE_W, PADDLE_Y, MAX_STEPS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
