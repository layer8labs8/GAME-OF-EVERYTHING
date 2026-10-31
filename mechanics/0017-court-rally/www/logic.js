(function (root) {
  const W = 300;
  const H = 440;
  const PADDLE_W = 64;
  const PLAYER_Y = 416;
  const AI_Y = 24;
  const PLAYER_SPEED = 9;
  const AI_SPEED = 4.9;
  const WIN_SCORE = 5;
  const MAX_STEPS = 1600;
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

  function serveBall(state, towardPlayer) {
    const dirSign = nextRandom(state) < 0.5 ? -1 : 1;
    const vx = dirSign * (1.5 + nextRandom(state) * 2.0);
    const vy = (towardPlayer ? 1 : -1) * 5.2;
    state.ball = { x: W / 2, y: H / 2, vx, vy, r: 6 };
  }

  function createState(seed) {
    const state = {
      w: W,
      h: H,
      paddleW: PADDLE_W,
      playerX: W / 2,
      aiX: W / 2,
      ball: { x: W / 2, y: H / 2, vx: 2, vy: 5.2, r: 6 },
      playerScore: 0,
      aiScore: 0,
      rallies: 0,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    serveBall(state, true);
    return state;
  }

  function isOver(state) {
    return Boolean(state.playerScore >= WIN_SCORE || state.aiScore >= WIN_SCORE || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ACTIONS.slice();
  }

  function step(state, action) {
    if (isOver(state) || !ACTIONS.includes(action)) throw new Error('Illegal action');

    const half = state.paddleW / 2;
    if (action === 'L') state.playerX = clamp(state.playerX - PLAYER_SPEED, half, W - half);
    else if (action === 'R') state.playerX = clamp(state.playerX + PLAYER_SPEED, half, W - half);

    const b = state.ball;
    const aiTarget = b.vy < 0 ? b.x : W / 2;
    const diff = aiTarget - state.aiX;
    state.aiX = clamp(state.aiX + clamp(diff, -AI_SPEED, AI_SPEED), half, W - half);

    b.x += b.vx;
    b.y += b.vy;

    if (b.x - b.r < 0) {
      b.x = b.r;
      b.vx = Math.abs(b.vx);
    } else if (b.x + b.r > W) {
      b.x = W - b.r;
      b.vx = -Math.abs(b.vx);
    }

    let reward = 0;

    if (b.vy > 0 && b.y + b.r >= PLAYER_Y - 6 && b.y - b.r <= PLAYER_Y + 6 && Math.abs(b.x - state.playerX) <= half + b.r) {
      b.y = PLAYER_Y - 6 - b.r;
      const offset = clamp((b.x - state.playerX) / half, -1, 1);
      const speed = Math.min(9.5, Math.hypot(b.vx, b.vy) * 1.05);
      const rawVx = offset * speed * 0.72;
      b.vx = Math.abs(rawVx) < 0.9 ? (rawVx >= 0 ? 0.9 : -0.9) : rawVx;
      b.vy = -Math.sqrt(Math.max(16, speed * speed - b.vx * b.vx));
      state.rallies += 1;
      reward += 1;
    } else if (b.vy < 0 && b.y - b.r <= AI_Y + 6 && b.y + b.r >= AI_Y - 6 && Math.abs(b.x - state.aiX) <= half + b.r) {
      b.y = AI_Y + 6 + b.r;
      const offset = clamp((b.x - state.aiX) / half, -1, 1);
      const speed = Math.min(9.5, Math.hypot(b.vx, b.vy) * 1.04);
      const rawVx = offset * speed * 0.72;
      b.vx = Math.abs(rawVx) < 0.9 ? (rawVx >= 0 ? 0.9 : -0.9) : rawVx;
      b.vy = Math.sqrt(Math.max(16, speed * speed - b.vx * b.vx));
    }

    if (b.y < 0) {
      state.playerScore += 1;
      reward += 15;
      if (state.playerScore >= WIN_SCORE) reward += 30;
      else serveBall(state, false);
    } else if (b.y > H) {
      state.aiScore += 1;
      reward -= 10;
      if (state.aiScore < WIN_SCORE) serveBall(state, true);
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return Math.max(0, state.playerScore * 100 + state.rallies * 5 - state.aiScore * 20);
  }

  const api = { W, H, PADDLE_W, PLAYER_Y, AI_Y, WIN_SCORE, MAX_STEPS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
