(function (root) {
  const WIDTH = 360;
  const HEIGHT = 500;
  const MAX_STEPS = 600;
  const BOSS_MAX_HP = 150;
  const CORE_HIT_DIST = 7;
  const GRAZE_DIST = 19;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function createState(seed) {
    const state = {
      rng: (seed >>> 0) || 1,
      player: {
        x: 180,
        y: 440,
        lives: 3,
        invuln: 0,
      },
      boss: {
        x: 180,
        y: 90,
        hp: BOSS_MAX_HP,
        maxHp: BOSS_MAX_HP,
      },
      bullets: [],
      playerBullets: [],
      grazeCount: 0,
      bombMeter: 0,
      stepCount: 0,
      score: 0,
      won: false,
      lost: false,
      lastEvent: 'Danmaku barrage initiated!',
    };
    return state;
  }

  function hasBasicTermination(state) {
    return Boolean(state.won || state.lost || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    if (hasBasicTermination(state)) return [];

    const actions = ['wait'];

    if (state.player.x > 20) actions.push('left', 'focus_left');
    if (state.player.x < WIDTH - 20) actions.push('right', 'focus_right');
    if (state.player.y > 60) actions.push('up');
    if (state.player.y < HEIGHT - 20) actions.push('down');

    if (state.bombMeter >= 100) {
      actions.push('bomb');
    }

    return actions;
  }

  function isOver(state) {
    return hasBasicTermination(state) || legalActions(state).length === 0;
  }

  function spawnDanmaku(state) {
    const phase = state.boss.hp > 100 ? 1 : state.boss.hp > 50 ? 2 : 3;
    const bx = state.boss.x;
    const by = state.boss.y;

    if (phase === 1) {
      // Rotating spiral ring
      const count = 8;
      const baseAngle = state.stepCount * 0.28;
      const speed = 4.2;
      for (let i = 0; i < count; i++) {
        const ang = baseAngle + (i * Math.PI * 2) / count;
        state.bullets.push({
          x: bx,
          y: by,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          grazed: false,
          color: '#f43f5e',
        });
      }
    } else if (phase === 2) {
      // Blossom radial bursts every 2 steps
      if (state.stepCount % 2 === 0) {
        const count = 12;
        const speed = 4.8;
        const offset = (state.stepCount % 4 === 0) ? 0 : Math.PI / 12;
        for (let i = 0; i < count; i++) {
          const ang = offset + (i * Math.PI * 2) / count;
          state.bullets.push({
            x: bx,
            y: by,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            grazed: false,
            color: '#a855f7',
          });
        }
      }
    } else {
      // Crossfire tempest + aimed needle
      const count = 10;
      const speed = 5.2;
      for (let i = 0; i < count; i++) {
        const ang = (i * Math.PI) / count + 0.15;
        state.bullets.push({
          x: bx,
          y: by,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          grazed: false,
          color: '#ec4899',
        });
      }
      // Aimed needle towards player
      const dx = state.player.x - bx;
      const dy = state.player.y - by;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      state.bullets.push({
        x: bx,
        y: by,
        vx: (dx / dist) * 6.5,
        vy: (dy / dist) * 6.5,
        grazed: false,
        color: '#fbbf24',
      });
    }
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action: ' + action);

    let reward = 1;

    // 1. Process player action
    if (action === 'left') state.player.x = Math.max(16, state.player.x - 16);
    else if (action === 'right') state.player.x = Math.min(WIDTH - 16, state.player.x + 16);
    else if (action === 'up') state.player.y = Math.max(50, state.player.y - 16);
    else if (action === 'down') state.player.y = Math.min(HEIGHT - 20, state.player.y + 16);
    else if (action === 'focus_left') state.player.x = Math.max(16, state.player.x - 8);
    else if (action === 'focus_right') state.player.x = Math.min(WIDTH - 16, state.player.x + 8);
    else if (action === 'bomb') {
      state.bullets = [];
      state.bombMeter = 0;
      state.boss.hp = Math.max(0, state.boss.hp - 25);
      reward += 30;
      state.score += 30;
      state.lastEvent = 'CELESTIAL BOMB DETONATED! Screen cleared & 25 damage dealt!';
      if (state.boss.hp <= 0) {
        state.won = true;
        state.stepCount += 1;
        return { reward: reward + 100, done: true };
      }
    }

    if (state.player.invuln > 0) state.player.invuln -= 1;

    // 2. Player auto-cannons fire
    state.playerBullets.push(
      { x: state.player.x - 6, y: state.player.y - 12 },
      { x: state.player.x + 6, y: state.player.y - 12 }
    );

    // Advance player bullets
    const nextPlayerBullets = [];
    for (const pb of state.playerBullets) {
      pb.y -= 26;
      if (pb.y < 0) continue;

      // Hit boss check
      if (Math.abs(pb.x - state.boss.x) < 32 && Math.abs(pb.y - state.boss.y) < 26) {
        state.boss.hp = Math.max(0, state.boss.hp - 2);
        state.score += 2;
        reward += 2;
        if (state.boss.hp <= 0) {
          state.won = true;
          state.score += 100;
          reward += 100;
          state.stepCount += 1;
          return { reward, done: true };
        }
      } else {
        nextPlayerBullets.push(pb);
      }
    }
    state.playerBullets = nextPlayerBullets;

    // 3. Boss movement & danmaku spawn
    state.boss.x = 180 + Math.sin(state.stepCount * 0.12) * 80;
    if (action !== 'bomb') {
      spawnDanmaku(state);
    }

    // 4. Advance enemy bullets & collisions
    const nextEnemyBullets = [];
    for (const b of state.bullets) {
      b.x += b.vx;
      b.y += b.vy;

      if (b.x < -30 || b.x > WIDTH + 30 || b.y < -30 || b.y > HEIGHT + 30) {
        continue;
      }

      const dx = b.x - state.player.x;
      const dy = b.y - state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Hit core check
      if (dist < CORE_HIT_DIST) {
        if (state.player.invuln === 0) {
          state.player.lives -= 1;
          state.player.invuln = 4;
          reward -= 25;
          state.lastEvent = `DIRECT HIT! Core damaged! ${state.player.lives} shields left.`;
          if (state.player.lives <= 0) {
            state.lost = true;
            state.stepCount += 1;
            return { reward, done: true };
          }
        }
        continue;
      }

      // Graze check
      if (!b.grazed && dist < GRAZE_DIST) {
        b.grazed = true;
        state.grazeCount += 1;
        state.bombMeter = Math.min(100, state.bombMeter + 6);
        state.score += 5;
        reward += 5;
      }

      nextEnemyBullets.push(b);
    }
    state.bullets = nextEnemyBullets;

    // Passive bomb meter charge
    if (action !== 'bomb') {
      state.bombMeter = Math.min(100, state.bombMeter + 1);
    }

    state.stepCount += 1;
    const done = isOver(state);
    return { reward, done };
  }

  function score(state) {
    return Math.max(0, state.score);
  }

  const api = {
    WIDTH,
    HEIGHT,
    MAX_STEPS,
    BOSS_MAX_HP,
    CORE_HIT_DIST,
    GRAZE_DIST,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
