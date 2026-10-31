(function (root) {
  'use strict';

  const W = 360;
  const H = 640;
  const MAX_STEPS = 1500;
  const CANNON_Y = 580;
  const BREACH_Y = 480;

  function nextRandom(state) {
    state.rng = ((state.rng * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rng / 0x7fffffff;
  }

  function createInvaders(wave) {
    const invaders = [];
    const startY = Math.min(160, 90 + (wave - 1) * 12);
    let id = 1;

    for (let row = 0; row < 4; row++) {
      let type = 'octopus';
      let points = 10;
      if (row === 0) {
        type = 'squid';
        points = 30;
      } else if (row === 1 || row === 2) {
        type = 'crab';
        points = 20;
      }

      for (let col = 0; col < 5; col++) {
        invaders.push({
          id: id++,
          row,
          col,
          x: 55 + col * 48,
          y: startY + row * 32,
          type,
          points,
          alive: true,
        });
      }
    }
    return invaders;
  }

  function createBunkers() {
    const bunkers = [];
    const bxPositions = [70, 180, 290];

    for (let b = 0; b < bxPositions.length; b++) {
      const cx = bxPositions[b];
      const segments = [
        { x: cx - 18, y: 490, w: 12, h: 12, hp: 3 },
        { x: cx - 6, y: 480, w: 12, h: 12, hp: 3 },
        { x: cx + 6, y: 480, w: 12, h: 12, hp: 3 },
        { x: cx + 18, y: 490, w: 12, h: 12, hp: 3 },
      ];
      bunkers.push(segments);
    }
    return bunkers;
  }

  function createState(seed = 12345) {
    const curRng = (seed >>> 0) || 1;

    const state = {
      player: {
        x: 180,
        y: CANNON_Y,
        lives: 3,
        bullet: null,
      },
      invaders: [],
      fleet: {
        dir: 1,
        timer: 0,
        interval: 16,
      },
      bombs: [],
      bunkers: createBunkers(),
      ufo: null,
      ufoTimer: 100,
      bombTimer: 18,
      wave: 1,
      points: 0,
      stepCount: 0,
      breached: false,
      rng: curRng,
    };

    state.invaders = createInvaders(1);
    return state;
  }

  function isOver(state) {
    return state.player.lives <= 0 || state.breached || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    const actions = ['left', 'right', 'wait'];
    if (!state.player.bullet) {
      actions.push('fire');
    }
    return actions;
  }

  function step(state, action) {
    if (!action || typeof action !== 'string') {
      throw new Error('Invalid action');
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    let reward = 0;

    // 1. Handle player action
    if (action === 'left') {
      state.player.x = Math.max(22, state.player.x - 8);
    } else if (action === 'right') {
      state.player.x = Math.min(338, state.player.x + 8);
    } else if (action === 'fire') {
      if (state.player.bullet) {
        throw new Error('Laser already in flight');
      }
      state.player.bullet = { x: state.player.x, y: CANNON_Y - 14 };
      reward += 1;
    } else if (action === 'wait') {
      // Idle frame
    } else {
      throw new Error('Unknown action: ' + action);
    }

    // 2. Advance player bullet
    if (state.player.bullet) {
      state.player.bullet.y -= 14;
      if (state.player.bullet.y < 10) {
        state.player.bullet = null;
      }
    }

    // 3. UFO update & collision
    if (state.ufo) {
      state.ufo.x += state.ufo.vx;
      if (state.ufo.x > W + 30) {
        state.ufo = null;
      } else if (state.player.bullet) {
        const dx = Math.abs(state.player.bullet.x - state.ufo.x);
        const dy = Math.abs(state.player.bullet.y - state.ufo.y);
        if (dx <= 18 && dy <= 10) {
          state.points += state.ufo.points;
          reward += state.ufo.points;
          state.ufo = null;
          state.player.bullet = null;
        }
      }
    } else {
      state.ufoTimer -= 1;
      if (state.ufoTimer <= 0) {
        state.ufo = { x: -20, y: 44, vx: 3.5, points: 100 };
        state.ufoTimer = 120 + Math.floor(nextRandom(state) * 80);
      }
    }

    // 4. Fleet march logic
    const living = state.invaders.filter((inv) => inv.alive);
    if (living.length === 0) {
      // Wave cleared!
      state.wave += 1;
      state.points += 200;
      reward += 200;
      state.invaders = createInvaders(state.wave);
      state.fleet.dir = 1;
      state.fleet.timer = 0;
      state.fleet.interval = 14;
    } else {
      // Interval speeds up as living count drops
      state.fleet.interval = Math.max(3, Math.floor(living.length * 0.8));
      state.fleet.timer += 1;

      if (state.fleet.timer >= state.fleet.interval) {
        state.fleet.timer = 0;
        let edgeHit = false;

        for (let i = 0; i < living.length; i++) {
          const inv = living[i];
          if ((state.fleet.dir === 1 && inv.x >= 332) || (state.fleet.dir === -1 && inv.x <= 28)) {
            edgeHit = true;
            break;
          }
        }

        if (edgeHit) {
          state.fleet.dir = -state.fleet.dir;
          for (let i = 0; i < living.length; i++) {
            living[i].y += 16;
            if (living[i].y >= BREACH_Y) {
              state.breached = true;
            }
          }
        } else {
          for (let i = 0; i < living.length; i++) {
            living[i].x += 6 * state.fleet.dir;
          }
        }
      }
    }

    // 5. Invader bomb drops
    state.bombTimer -= 1;
    if (state.bombTimer <= 0 && living.length > 0) {
      // Pick bottom-most invader in random column
      const cols = {};
      for (let i = 0; i < living.length; i++) {
        const inv = living[i];
        if (!cols[inv.col] || inv.row > cols[inv.col].row) {
          cols[inv.col] = inv;
        }
      }
      const shooters = Object.values(cols);
      const chosen = shooters[Math.floor(nextRandom(state) * shooters.length)];
      state.bombs.push({ x: chosen.x, y: chosen.y + 12, vy: 5 });
      state.bombTimer = Math.max(8, 20 - state.wave * 2) + Math.floor(nextRandom(state) * 12);
    }

    // 6. Advance bombs & check collisions with bunkers & player
    for (let b = state.bombs.length - 1; b >= 0; b--) {
      const bomb = state.bombs[b];
      bomb.y += bomb.vy;

      // Hit bunker?
      let bombHitBunker = false;
      for (let bi = 0; bi < state.bunkers.length; bi++) {
        const bunker = state.bunkers[bi];
        for (let si = 0; si < bunker.length; si++) {
          const seg = bunker[si];
          if (seg.hp > 0) {
            if (
              bomb.x >= seg.x - seg.w / 2 &&
              bomb.x <= seg.x + seg.w / 2 &&
              bomb.y >= seg.y - seg.h / 2 &&
              bomb.y <= seg.y + seg.h / 2
            ) {
              seg.hp -= 1;
              bombHitBunker = true;
              break;
            }
          }
        }
        if (bombHitBunker) break;
      }

      if (bombHitBunker) {
        state.bombs.splice(b, 1);
        continue;
      }

      // Hit player cannon?
      const dx = Math.abs(bomb.x - state.player.x);
      const dy = Math.abs(bomb.y - state.player.y);
      if (dx <= 14 && dy <= 10) {
        state.player.lives -= 1;
        state.bombs.splice(b, 1);
        reward -= 50;
        continue;
      }

      // Offscreen
      if (bomb.y > H + 10) {
        state.bombs.splice(b, 1);
      }
    }

    // 7. Player bullet collisions with invaders & bunkers
    if (state.player.bullet) {
      // Check bunkers
      let bulletHitBunker = false;
      for (let bi = 0; bi < state.bunkers.length; bi++) {
        const bunker = state.bunkers[bi];
        for (let si = 0; si < bunker.length; si++) {
          const seg = bunker[si];
          if (seg.hp > 0) {
            if (
              state.player.bullet.x >= seg.x - seg.w / 2 &&
              state.player.bullet.x <= seg.x + seg.w / 2 &&
              state.player.bullet.y >= seg.y - seg.h / 2 &&
              state.player.bullet.y <= seg.y + seg.h / 2
            ) {
              seg.hp -= 1;
              bulletHitBunker = true;
              break;
            }
          }
        }
        if (bulletHitBunker) break;
      }

      if (bulletHitBunker) {
        state.player.bullet = null;
      } else {
        // Check invaders
        for (let i = 0; i < state.invaders.length; i++) {
          const inv = state.invaders[i];
          if (inv.alive) {
            const idx = Math.abs(state.player.bullet.x - inv.x);
            const idy = Math.abs(state.player.bullet.y - inv.y);
            if (idx <= 14 && idy <= 12) {
              inv.alive = false;
              state.points += inv.points;
              reward += inv.points;
              state.player.bullet = null;
              break;
            }
          }
        }
      }
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = {
    W,
    H,
    MAX_STEPS,
    CANNON_Y,
    BREACH_Y,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GameLogic = api;
  }
})(typeof self !== 'undefined' ? self : globalThis);
