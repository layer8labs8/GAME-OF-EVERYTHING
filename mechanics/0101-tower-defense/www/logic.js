(function (root) {
  const MAX_WAVES = 5;
  const MAX_STEPS = 500;
  const START_GOLD = 60;
  const START_HP = 10;

  const WAYPOINTS = [
    { x: 180, y: 30 },
    { x: 180, y: 130 },
    { x: 80, y: 130 },
    { x: 80, y: 270 },
    { x: 280, y: 270 },
    { x: 280, y: 410 },
    { x: 100, y: 410 },
    { x: 100, y: 550 },
    { x: 180, y: 550 },
    { x: 180, y: 610 },
  ];

  const PLATFORMS = [
    { x: 130, y: 80 },
    { x: 130, y: 200 },
    { x: 230, y: 200 },
    { x: 180, y: 340 },
    { x: 50, y: 480 },
    { x: 230, y: 480 },
  ];

  const TOWER_TYPES = {
    ballista: { cost: 25, damage: 3, range: 110, rate: 2 },
    cannon: { cost: 40, damage: 7, range: 100, rate: 4 },
    frost: { cost: 35, damage: 2, range: 90, rate: 3 },
  };
  const UPGRADE_COST = 30;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function spawnWave(state) {
    state.waveCreepsLeft = 6 + state.wave * 2;
    state.spawnTimer = 2;
  }

  function createState(seed) {
    const state = {
      slots: PLATFORMS.map(() => ({ type: 'empty', level: 1, cooldown: 0 })),
      creeps: [],
      gold: START_GOLD,
      citadelHp: START_HP,
      wave: 1,
      waveCreepsLeft: 0,
      spawnTimer: 0,
      points: 0,
      won: false,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    spawnWave(state);
    return state;
  }

  function isOver(state) {
    return Boolean(state.citadelHp <= 0 || state.won || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    const acts = ['wait'];

    for (let i = 0; i < state.slots.length; i++) {
      const sl = state.slots[i];
      if (sl.type === 'empty') {
        if (state.gold >= TOWER_TYPES.ballista.cost) acts.push(`build_ballista_${i}`);
        if (state.gold >= TOWER_TYPES.cannon.cost) acts.push(`build_cannon_${i}`);
        if (state.gold >= TOWER_TYPES.frost.cost) acts.push(`build_frost_${i}`);
      } else if (sl.level < 2 && state.gold >= UPGRADE_COST) {
        acts.push(`upgrade_${i}`);
      }
    }
    return acts;
  }

  function dist(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    let reward = 0;

    // Process player build/upgrade command
    if (action.startsWith('build_')) {
      const parts = action.split('_');
      const type = parts[1];
      const slotIdx = parseInt(parts[2], 10);
      const cost = TOWER_TYPES[type].cost;
      state.gold -= cost;
      state.slots[slotIdx] = { type, level: 1, cooldown: 0 };
    } else if (action.startsWith('upgrade_')) {
      const slotIdx = parseInt(action.split('_')[1], 10);
      state.gold -= UPGRADE_COST;
      state.slots[slotIdx].level += 1;
    }

    // Spawn creeps
    if (state.waveCreepsLeft > 0) {
      state.spawnTimer -= 1;
      if (state.spawnTimer <= 0) {
        const hp = 10 + state.wave * 6;
        state.creeps.push({
          id: state.stepCount * 100 + state.waveCreepsLeft,
          x: WAYPOINTS[0].x,
          y: WAYPOINTS[0].y,
          pathIdx: 0,
          hp,
          maxHp: hp,
          speed: 4.5,
          slowed: 0,
        });
        state.waveCreepsLeft -= 1;
        state.spawnTimer = 10;
      }
    }

    // Advance Creeps
    for (let i = state.creeps.length - 1; i >= 0; i--) {
      const c = state.creeps[i];
      const moveSpeed = c.slowed > 0 ? c.speed * 0.5 : c.speed;
      if (c.slowed > 0) c.slowed -= 1;

      const targetWP = WAYPOINTS[c.pathIdx + 1];
      const d = dist(c.x, c.y, targetWP.x, targetWP.y);

      if (d <= moveSpeed) {
        c.x = targetWP.x;
        c.y = targetWP.y;
        c.pathIdx += 1;
        if (c.pathIdx >= WAYPOINTS.length - 1) {
          // Reached base
          state.creeps.splice(i, 1);
          state.citadelHp -= 1;
          reward -= 30;
          continue;
        }
      } else {
        c.x += ((targetWP.x - c.x) / d) * moveSpeed;
        c.y += ((targetWP.y - c.y) / d) * moveSpeed;
      }
    }

    // Towers Acquire & Fire
    for (let i = 0; i < state.slots.length; i++) {
      const sl = state.slots[i];
      if (sl.type === 'empty') continue;
      const base = TOWER_TYPES[sl.type];
      const range = base.range + (sl.level > 1 ? 20 : 0);
      const dmg = base.damage * (sl.level > 1 ? 1.8 : 1);
      const plat = PLATFORMS[i];

      if (sl.cooldown > 0) {
        sl.cooldown -= 1;
        continue;
      }

      // Find furthest creep in range
      let bestCreep = null;
      let maxProgress = -1;

      for (let j = 0; j < state.creeps.length; j++) {
        const c = state.creeps[j];
        const d = dist(plat.x, plat.y, c.x, c.y);
        if (d <= range) {
          const progress = c.pathIdx * 1000 + dist(WAYPOINTS[c.pathIdx].x, WAYPOINTS[c.pathIdx].y, c.x, c.y);
          if (progress > maxProgress) {
            maxProgress = progress;
            bestCreep = c;
          }
        }
      }

      if (bestCreep) {
        bestCreep.hp -= dmg;
        if (sl.type === 'frost') bestCreep.slowed = 6;
        sl.cooldown = base.rate;
      }
    }

    // Remove dead creeps
    for (let i = state.creeps.length - 1; i >= 0; i--) {
      const c = state.creeps[i];
      if (c.hp <= 0) {
        state.creeps.splice(i, 1);
        state.gold += 10;
        state.points += 50;
        reward += 50;
      }
    }

    // Advance waves
    if (state.waveCreepsLeft === 0 && state.creeps.length === 0 && state.citadelHp > 0) {
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

  const api = { WAYPOINTS, PLATFORMS, TOWER_TYPES, UPGRADE_COST, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
