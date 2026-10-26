(function (root) {
  const ARENA_W = 360;
  const ARENA_H = 640;
  const PLAYER_W = 20;
  const PLAYER_H = 26;
  const GRAVITY = 1.2;
  const MAX_FALL = 14;
  const JUMP_FORCE = -14;
  const RUN_SPEED = 5.5;
  const MAX_STEPS = 1200;

  const PLATFORMS = [
    { x: 20, y: 580, w: 130, h: 18 },
    { x: 180, y: 530, w: 130, h: 18 },
    { x: 60, y: 440, w: 120, h: 18 },
    { x: 210, y: 360, w: 120, h: 18 },
    { x: 70, y: 270, w: 120, h: 18 },
    { x: 200, y: 180, w: 130, h: 18 },
    { x: 30, y: 100, w: 120, h: 18 },
  ];

  const PORTAL = { x: 60, y: 60, w: 36, h: 40 };

  const COIN_SPOTS = [
    { x: 80, y: 550 },
    { x: 240, y: 500 },
    { x: 120, y: 410 },
    { x: 270, y: 330 },
    { x: 130, y: 240 },
    { x: 260, y: 150 },
    { x: 90, y: 70 },
  ];

  function createState(seed) {
    return {
      player: { x: 50, y: 580, vx: 0, vy: 0, grounded: true },
      coins: COIN_SPOTS.map((c) => ({ x: c.x, y: c.y, collected: false })),
      coinsCollected: 0,
      lives: 3,
      points: 0,
      won: false,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
  }

  function isOver(state) {
    return Boolean(state.lives <= 0 || state.won || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ['left', 'right', 'jump', 'wait'];
  }

  function step(state, action) {
    if (isOver(state) || (action !== 'left' && action !== 'right' && action !== 'jump' && action !== 'wait')) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    let reward = 0;
    const p = state.player;
    const prevY = p.y;

    // Movement
    if (action === 'left') {
      p.vx = -RUN_SPEED;
    } else if (action === 'right') {
      p.vx = RUN_SPEED;
    } else if (action === 'jump') {
      if (p.grounded) {
        p.vy = JUMP_FORCE;
        p.grounded = false;
      }
    } else if (action === 'wait') {
      p.vx *= 0.65;
      if (Math.abs(p.vx) < 0.2) p.vx = 0;
    }

    // Gravity
    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY);
    p.x = Math.max(12, Math.min(ARENA_W - 12, p.x + p.vx));
    p.y += p.vy;

    // Platform collisions
    p.grounded = false;
    const footY = p.y;
    const prevFootY = prevY;

    if (p.vy >= 0) {
      for (let i = 0; i < PLATFORMS.length; i++) {
        const plat = PLATFORMS[i];
        if (p.x + PLAYER_W / 2 >= plat.x && p.x - PLAYER_W / 2 <= plat.x + plat.w) {
          if (prevFootY <= plat.y && footY >= plat.y) {
            p.y = plat.y;
            p.vy = 0;
            p.grounded = true;
            break;
          }
        }
      }
    }

    // Collect coins
    for (let i = 0; i < state.coins.length; i++) {
      const c = state.coins[i];
      if (!c.collected) {
        const dx = p.x - c.x;
        const dy = p.y - PLAYER_H / 2 - c.y;
        if (dx * dx + dy * dy < 22 * 22) {
          c.collected = true;
          state.coinsCollected += 1;
          state.points += 50;
          reward += 50;
        }
      }
    }

    // Check Portal Reach
    if (state.coinsCollected >= 4) {
      const inX = p.x >= PORTAL.x && p.x <= PORTAL.x + PORTAL.w;
      const inY = p.y >= PORTAL.y && p.y <= PORTAL.y + PORTAL.h + 10;
      if (inX && inY) {
        state.won = true;
        state.points += 300;
        reward += 300;
      }
    }

    // Fall hazard check
    if (p.y > ARENA_H + 20) {
      state.lives -= 1;
      reward -= 30;
      p.x = 50;
      p.y = 580;
      p.vx = 0;
      p.vy = 0;
      p.grounded = true;
    }

    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { ARENA_W, ARENA_H, PLATFORMS, PORTAL, COIN_SPOTS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
