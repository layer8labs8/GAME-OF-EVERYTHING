// Pure deterministic logic for 0062: Pinball (Neon Pinball)

const TABLE_WIDTH = 300;
const TABLE_HEIGHT = 500;
const BALL_RADIUS = 7;
const GRAVITY = 0.35;
const DAMPING = 0.99;
const MAX_STEPS = 500;
const INITIAL_BALLS = 3;

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resetBall(state) {
  state.inPlunger = true;
  state.ball = {
    x: 280,
    y: 420,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS
  };
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const state = {
    seed: safeSeed,
    ballsLeft: INITIAL_BALLS,
    scoreVal: 0,
    multiplier: 1,
    steps: 0,
    inPlunger: true,
    leftFlipperTimer: 0,
    rightFlipperTimer: 0,
    nudgeCooldown: 0,
    done: false,
    won: false,
    bumpers: [
      { id: 1, x: 105, y: 140, r: 20 },
      { id: 2, x: 195, y: 140, r: 20 },
      { id: 3, x: 150, y: 205, r: 20 }
    ],
    rollovers: [
      { id: 1, x: 90, y: 65, lit: false },
      { id: 2, x: 150, y: 65, lit: false },
      { id: 3, x: 210, y: 65, lit: false }
    ],
    message: 'Pull plunger to launch ball into neon arena.'
  };

  resetBall(state);
  return state;
}

function legalActions(state) {
  if (state.done) return [];

  if (state.inPlunger) {
    return ['launch', 'wait'];
  }

  return ['flip_left', 'flip_right', 'flip_both', 'nudge', 'wait'];
}

function step(state, action) {
  if (state.done) {
    return { reward: 0, done: true };
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  state.steps++;

  // Handle Action Inputs
  if (action === 'launch' && state.inPlunger) {
    state.inPlunger = false;
    state.ball.vx = -1.5;
    state.ball.vy = -13.5;
    state.message = 'Ball launched!';
  } else if (action === 'flip_left') {
    state.leftFlipperTimer = 4;
  } else if (action === 'flip_right') {
    state.rightFlipperTimer = 4;
  } else if (action === 'flip_both') {
    state.leftFlipperTimer = 4;
    state.rightFlipperTimer = 4;
  } else if (action === 'nudge') {
    if (state.nudgeCooldown <= 0) {
      state.ball.vx += (state.ball.x < TABLE_WIDTH / 2) ? 1.5 : -1.5;
      state.nudgeCooldown = 6;
      state.message = 'Table nudged!';
    }
  }

  if (state.nudgeCooldown > 0) state.nudgeCooldown--;
  if (state.leftFlipperTimer > 0) state.leftFlipperTimer--;
  if (state.rightFlipperTimer > 0) state.rightFlipperTimer--;

  // Physics Simulation Step
  if (!state.inPlunger) {
    // 1. Gravity and velocity integration
    state.ball.vy += GRAVITY;
    state.ball.vx *= DAMPING;
    state.ball.vy *= DAMPING;

    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    const b = state.ball;

    // 2. Wall Collisions
    // Left boundary
    if (b.x - b.radius < 20) {
      b.x = 20 + b.radius;
      b.vx = Math.abs(b.vx) * 0.8;
    }
    // Right boundary
    if (b.x + b.radius > 280) {
      b.x = 280 - b.radius;
      b.vx = -Math.abs(b.vx) * 0.8;
    }
    // Top boundary
    if (b.y - b.radius < 25) {
      b.y = 25 + b.radius;
      b.vy = Math.abs(b.vy) * 0.8;
    }

    // 3. Bumper Collisions
    for (const bmp of state.bumpers) {
      const dx = b.x - bmp.x;
      const dy = b.y - bmp.y;
      const dist = Math.hypot(dx, dy);
      const minDist = bmp.r + b.radius;

      if (dist < minDist) {
        // Collision response: push out and reflect radially with impulse
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        b.x = bmp.x + nx * minDist;
        b.y = bmp.y + ny * minDist;

        const impulse = 8.5;
        b.vx = nx * impulse;
        b.vy = ny * impulse;

        const pts = 100 * state.multiplier;
        state.scoreVal += pts;
        reward += pts;
        state.message = `Bumper hit! (+${pts} pts)`;
      }
    }

    // 4. Rollover Lanes Detection
    for (const r of state.rollovers) {
      if (!r.lit && Math.abs(b.x - r.x) < 18 && Math.abs(b.y - r.y) < 15) {
        r.lit = true;
        const pts = 50 * state.multiplier;
        state.scoreVal += pts;
        reward += pts;
        state.message = `Rollover gate passed! (+${pts} pts)`;

        // Check if all 3 lit
        if (state.rollovers.every(lane => lane.lit)) {
          state.multiplier = Math.min(5, state.multiplier + 1);
          state.scoreVal += 200;
          reward += 200;
          state.rollovers.forEach(lane => { lane.lit = false; });
          state.message = `COMBO MULTIPLIER UP! Now ${state.multiplier}X!`;
        }
      }
    }

    // 5. Slingshots
    // Left Slingshot at (50, 360) -> (75, 400)
    if (b.x < 75 && b.x > 45 && b.y > 360 && b.y < 405) {
      b.vx = Math.abs(b.vx) + 5;
      b.vy = -Math.abs(b.vy) - 3;
      const pts = 25 * state.multiplier;
      state.scoreVal += pts;
      reward += pts;
    }
    // Right Slingshot at (225, 400) -> (255, 360)
    if (b.x > 225 && b.x < 255 && b.y > 360 && b.y < 405) {
      b.vx = -Math.abs(b.vx) - 5;
      b.vy = -Math.abs(b.vy) - 3;
      const pts = 25 * state.multiplier;
      state.scoreVal += pts;
      reward += pts;
    }

    // 6. Flipper Interactions
    // Left Flipper zone: x in [80, 135], y in [425, 460]
    if (b.x >= 75 && b.x <= 140 && b.y >= 425 && b.y <= 460) {
      if (state.leftFlipperTimer > 0) {
        b.vy = -9.5;
        b.vx = 2.5 + (b.x - 75) * 0.08;
        const pts = 20 * state.multiplier;
        state.scoreVal += pts;
        reward += pts;
        state.message = 'Left Flipper strike!';
      } else {
        // Rest deflection
        b.vy = -Math.abs(b.vy) * 0.5;
      }
    }

    // Right Flipper zone: x in [160, 225], y in [425, 460]
    if (b.x >= 160 && b.x <= 225 && b.y >= 425 && b.y <= 460) {
      if (state.rightFlipperTimer > 0) {
        b.vy = -9.5;
        b.vx = -2.5 - (225 - b.x) * 0.08;
        const pts = 20 * state.multiplier;
        state.scoreVal += pts;
        reward += pts;
        state.message = 'Right Flipper strike!';
      } else {
        b.vy = -Math.abs(b.vy) * 0.5;
      }
    }

    // 7. Drain Detection
    if (b.y > 480) {
      state.ballsLeft--;
      if (state.ballsLeft > 0) {
        resetBall(state);
        reward -= 20;
        state.message = `Ball drained! ${state.ballsLeft} balls remaining.`;
      } else {
        state.done = true;
        state.won = (state.scoreVal >= 1000);
        reward += state.won ? 300 : -50;
        state.message = state.won
          ? `High Score Victory! Final: ${state.scoreVal} pts!`
          : `Game Over! Final Score: ${state.scoreVal} pts.`;
      }
    }
  }

  // 8. Max Step Timeout Check
  if (state.steps >= MAX_STEPS) {
    state.done = true;
    state.won = (state.scoreVal >= 800);
    state.message = 'Session completed.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.scoreVal;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TABLE_WIDTH,
    TABLE_HEIGHT,
    BALL_RADIUS,
    INITIAL_BALLS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
