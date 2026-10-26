(function (root) {
  const GRID_SIZE = 10;
  const MAX_STEPS = 200;
  const TOTAL_ENEMIES = 6;

  const DIR_DELTAS = {
    N: { x: 0, y: -1 },
    S: { x: 0, y: 1 },
    E: { x: 1, y: 0 },
    W: { x: -1, y: 0 },
  };

  const BASE_MAP = [
    '.B..B..B..',
    'BS.BB.S..B',
    '.B..B..B..',
    '..S.SS.S..',
    'BB..BB..BB',
    'BB..BB..BB',
    '..S.SS.S..',
    '.B..B..B..',
    '..S.BBB.S.',
    '....BHB...',
  ];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function getBaseGrid() {
    return BASE_MAP.map((row) => row.split(''));
  }

  function createState(seed) {
    const state = {
      rng: (seed >>> 0) || 1,
      grid: getBaseGrid(),
      player: {
        x: 3,
        y: 8,
        dir: 'N',
        reload: 0,
        lives: 3,
      },
      hq: {
        x: 5,
        y: 9,
        alive: true,
      },
      enemies: [],
      bullets: [],
      enemiesToSpawn: TOTAL_ENEMIES,
      enemiesDestroyed: 0,
      stepCount: 0,
      score: 0,
      won: false,
      lost: false,
    };

    spawnEnemy(state, 0, 0);
    spawnEnemy(state, 9, 0);
    return state;
  }

  function spawnEnemy(state, x, y) {
    if (state.enemiesToSpawn <= 0) return;
    state.enemies.push({
      id: TOTAL_ENEMIES - state.enemiesToSpawn + 1,
      x,
      y,
      dir: 'S',
      reload: 1,
      hp: 1,
    });
    state.enemiesToSpawn -= 1;
  }

  function hasBasicTermination(state) {
    return Boolean(state.won || state.lost || state.stepCount >= MAX_STEPS);
  }

  function isBlocked(state, x, y, ignoreId) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return true;
    const cell = state.grid[y][x];
    if (cell === 'B' || cell === 'S' || cell === 'H') return true;
    if (state.player.x === x && state.player.y === y && ignoreId !== 'player') return true;
    for (const en of state.enemies) {
      if (en.x === x && en.y === y && en.id !== ignoreId) return true;
    }
    return false;
  }

  function legalActions(state) {
    if (hasBasicTermination(state)) return [];

    const actions = ['wait'];

    for (const d of ['n', 's', 'e', 'w']) {
      actions.push('turn_' + d);
    }

    for (const [dirKey, delta] of Object.entries(DIR_DELTAS)) {
      const nx = state.player.x + delta.x;
      const ny = state.player.y + delta.y;
      if (!isBlocked(state, nx, ny, 'player')) {
        actions.push('move_' + dirKey.toLowerCase());
      }
    }

    if (state.player.reload === 0) {
      actions.push('fire');
    }

    return actions;
  }

  function isOver(state) {
    return hasBasicTermination(state) || legalActions(state).length === 0;
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) throw new Error('Illegal action: ' + action);

    let reward = 0;

    // 1. Process player action
    if (state.player.reload > 0) state.player.reload -= 1;

    if (action.startsWith('turn_')) {
      state.player.dir = action.slice(5).toUpperCase();
    } else if (action.startsWith('move_')) {
      const d = action.slice(5).toUpperCase();
      state.player.dir = d;
      const delta = DIR_DELTAS[d];
      state.player.x += delta.x;
      state.player.y += delta.y;
    } else if (action === 'fire') {
      const delta = DIR_DELTAS[state.player.dir];
      state.bullets.push({
        x: state.player.x + delta.x,
        y: state.player.y + delta.y,
        vx: delta.x,
        vy: delta.y,
        fromPlayer: true,
      });
      state.player.reload = 2;
    }

    // 2. Advance Bullets
    const activeBullets = [];

    function checkHit(b, x, y) {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return true;
      const cell = state.grid[y][x];
      if (cell === 'B') {
        state.grid[y][x] = '.';
        if (b.fromPlayer) {
          reward += 5;
          state.score += 5;
        }
        return true;
      }
      if (cell === 'S') return true;
      if (cell === 'H' || (x === state.hq.x && y === state.hq.y)) {
        state.hq.alive = false;
        state.lost = true;
        reward -= 100;
        return true;
      }
      if (!b.fromPlayer && x === state.player.x && y === state.player.y) {
        state.player.lives -= 1;
        reward -= 20;
        if (state.player.lives <= 0) state.lost = true;
        return true;
      }
      if (b.fromPlayer) {
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const en = state.enemies[i];
          if (en.x === x && en.y === y) {
            en.hp -= 1;
            if (en.hp <= 0) {
              state.enemies.splice(i, 1);
              state.enemiesDestroyed += 1;
              reward += 50;
              state.score += 50;
            }
            return true;
          }
        }
      }
      return false;
    }

    for (const b of state.bullets) {
      if (checkHit(b, b.x, b.y)) continue;
      const nx = b.x + b.vx;
      const ny = b.y + b.vy;
      if (checkHit(b, nx, ny)) continue;
      b.x = nx;
      b.y = ny;
      activeBullets.push(b);
    }
    state.bullets = activeBullets;

    // Bullet cancellations
    for (let i = 0; i < state.bullets.length; i++) {
      for (let j = i + 1; j < state.bullets.length; j++) {
        const b1 = state.bullets[i];
        const b2 = state.bullets[j];
        if (b1 && b2 && b1.x === b2.x && b1.y === b2.y && b1.fromPlayer !== b2.fromPlayer) {
          state.bullets[i] = null;
          state.bullets[j] = null;
        }
      }
    }
    state.bullets = state.bullets.filter(Boolean);

    // 3. Enemy AI turns
    for (const en of state.enemies) {
      if (en.reload > 0) en.reload -= 1;

      let canShoot = false;
      let shootDir = null;

      // Check HQ alignment
      if (en.x === state.hq.x && en.y < state.hq.y) {
        let blocked = false;
        for (let y = en.y + 1; y < state.hq.y; y++) {
          if (state.grid[y][en.x] === 'S') { blocked = true; break; }
        }
        if (!blocked) { canShoot = true; shootDir = 'S'; }
      }
      // Check Player alignment
      if (!canShoot) {
        if (en.x === state.player.x) {
          const dir = state.player.y > en.y ? 'S' : 'N';
          const y1 = Math.min(en.y, state.player.y) + 1;
          const y2 = Math.max(en.y, state.player.y);
          let blocked = false;
          for (let y = y1; y < y2; y++) {
            if (state.grid[y][en.x] === 'S') { blocked = true; break; }
          }
          if (!blocked) { canShoot = true; shootDir = dir; }
        } else if (en.y === state.player.y) {
          const dir = state.player.x > en.x ? 'E' : 'W';
          const x1 = Math.min(en.x, state.player.x) + 1;
          const x2 = Math.max(en.x, state.player.x);
          let blocked = false;
          for (let x = x1; x < x2; x++) {
            if (state.grid[en.y][x] === 'S') { blocked = true; break; }
          }
          if (!blocked) { canShoot = true; shootDir = dir; }
        }
      }

      if (canShoot && en.reload === 0) {
        en.dir = shootDir;
        const delta = DIR_DELTAS[shootDir];
        state.bullets.push({
          x: en.x + delta.x,
          y: en.y + delta.y,
          vx: delta.x,
          vy: delta.y,
          fromPlayer: false,
        });
        en.reload = 3;
      } else {
        const rnd = nextRandom(state);
        let desiredDir = 'S';
        if (rnd < 0.45) desiredDir = 'S';
        else if (rnd < 0.65) desiredDir = 'E';
        else if (rnd < 0.85) desiredDir = 'W';
        else desiredDir = 'N';

        const d = DIR_DELTAS[desiredDir];
        const nx = en.x + d.x;
        const ny = en.y + d.y;
        if (!isBlocked(state, nx, ny, en.id)) {
          en.x = nx;
          en.y = ny;
          en.dir = desiredDir;
        } else {
          const altDir = desiredDir === 'S' || desiredDir === 'N' ? (rnd > 0.5 ? 'E' : 'W') : 'S';
          const ad = DIR_DELTAS[altDir];
          const ax = en.x + ad.x;
          const ay = en.y + ad.y;
          if (!isBlocked(state, ax, ay, en.id)) {
            en.x = ax;
            en.y = ay;
            en.dir = altDir;
          }
        }
      }
    }

    // 4. Spawn wave reinforcements
    if (state.enemies.length < 2 && state.enemiesToSpawn > 0) {
      const spawns = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 9, y: 0 },
      ];
      for (const sp of spawns) {
        if (!isBlocked(state, sp.x, sp.y, null)) {
          spawnEnemy(state, sp.x, sp.y);
          break;
        }
      }
    }

    // 5. Win check
    if (state.enemiesDestroyed >= TOTAL_ENEMIES && state.enemies.length === 0 && state.hq.alive) {
      state.won = true;
      reward += 100;
      state.score += 100;
    }

    state.stepCount += 1;
    const done = isOver(state);
    return { reward, done };
  }

  function score(state) {
    return Math.max(0, state.score);
  }

  const api = {
    GRID_SIZE,
    MAX_STEPS,
    TOTAL_ENEMIES,
    DIR_DELTAS,
    createState,
    legalActions,
    step,
    isOver,
    score,
    isBlocked,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
