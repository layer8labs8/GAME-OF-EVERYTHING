(function (root) {
  const ARENA_W = 360;
  const ARENA_H = 640;
  const PLAYER_Y = 580;
  const PLAYER_W = 28;
  const PLAYER_H = 22;
  const MAX_WAVES = 10;
  const MAX_STEPS = 2000;
  const MAX_BULLETS = 5;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnWave(state) {
    const count = 4 + Math.min(6, state.wave);
    state.waveEnemiesLeft = count;
    state.spawnTimer = 2;
  }

  function createState(seed) {
    const state = {
      player: { x: ARENA_W / 2, speed: 8, fireCooldown: 0 },
      bullets: [],
      enemies: [],
      shields: 3,
      wave: 1,
      waveEnemiesLeft: 0,
      spawnTimer: 0,
      multiplier: 1,
      points: 0,
      won: false,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    spawnWave(state);
    return state;
  }

  function isOver(state) {
    return Boolean(state.shields <= 0 || state.won || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ['left', 'right', 'stay', 'fire'];
  }

  function step(state, action) {
    if (isOver(state) || (action !== 'left' && action !== 'right' && action !== 'stay' && action !== 'fire')) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    let reward = 0;

    // Player action
    const p = state.player;
    if (action === 'left') {
      p.x = Math.max(16, p.x - p.speed);
    } else if (action === 'right') {
      p.x = Math.min(ARENA_W - 16, p.x + p.speed);
    } else if (action === 'fire') {
      if (p.fireCooldown <= 0 && state.bullets.length < MAX_BULLETS) {
        state.bullets.push({ x: p.x, y: PLAYER_Y - 14, vy: -14 });
        p.fireCooldown = 6;
      }
    }

    if (p.fireCooldown > 0) p.fireCooldown -= 1;

    // Advance bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      state.bullets[i].y += state.bullets[i].vy;
      if (state.bullets[i].y < -10) {
        state.bullets.splice(i, 1);
      }
    }

    // Spawn enemy trickle
    if (state.waveEnemiesLeft > 0) {
      state.spawnTimer -= 1;
      if (state.spawnTimer <= 0) {
        const x = 30 + Math.floor(nextRandom(state) * (ARENA_W - 60));
        const vx = (nextRandom(state) - 0.5) * 3;
        const vy = 2.2 + state.wave * 0.25;
        state.enemies.push({ x, y: -20, vx, vy, hp: 1, type: nextRandom(state) < 0.3 ? 2 : 1 });
        state.waveEnemiesLeft -= 1;
        state.spawnTimer = 18 - Math.min(10, state.wave);
      }
    }

    // Advance enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      e.x += e.vx;
      e.y += e.vy;
      if (e.x < 18) { e.x = 18; e.vx = Math.abs(e.vx); }
      else if (e.x > ARENA_W - 18) { e.x = ARENA_W - 18; e.vx = -Math.abs(e.vx); }

      // Check breach
      if (e.y >= PLAYER_Y + 10) {
        state.enemies.splice(i, 1);
        state.shields -= 1;
        state.multiplier = 1;
        reward -= 20;
        continue;
      }

      // Check collision with player
      const dx = Math.abs(e.x - p.x);
      const dy = Math.abs(e.y - PLAYER_Y);
      if (dx < (PLAYER_W + 16) / 2 && dy < (PLAYER_H + 16) / 2) {
        state.enemies.splice(i, 1);
        state.shields -= 1;
        state.multiplier = 1;
        reward -= 20;
        continue;
      }
    }

    // Bullet vs enemy collisions
    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      const b = state.bullets[bi];
      let hit = false;
      for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
        const e = state.enemies[ei];
        if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
          hit = true;
          state.enemies.splice(ei, 1);
          const killPoints = 100 * state.multiplier;
          state.points += killPoints;
          reward += killPoints;
          state.multiplier = Math.min(5, state.multiplier + 1);
          break;
        }
      }
      if (hit) {
        state.bullets.splice(bi, 1);
      }
    }

    // Wave progression
    if (state.waveEnemiesLeft === 0 && state.enemies.length === 0 && state.shields > 0) {
      if (state.wave >= MAX_WAVES) {
        state.won = true;
        state.points += 500;
        reward += 500;
      } else {
        state.wave += 1;
        spawnWave(state);
      }
    }

    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { ARENA_W, ARENA_H, PLAYER_Y, MAX_WAVES, MAX_STEPS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
